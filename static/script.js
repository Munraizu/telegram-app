// --- Инициализация Telegram Web App ---
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand(); // Расширяем приложение на весь экран

// --- Конфигурация ---
// URL вашей опубликованной Google Таблицы в формате TSV
// ЗАМЕНИТЕ НА ВАШУ РЕАЛЬНУЮ ССЫЛКУ!
const GOOGLE_SHEET_TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRzFm-I4hL8tKOSXOsW-yeg4N2-WJfA9aLBXfxf4pF6pvGQFPbnj1fTztVWTQVkS9q-seBCXLMx07Z9/pub?output=tsv';

// Ожидаемые имена столбцов в Google Таблице
// ВАЖНО: Имена должны ТОЧНО совпадать с заголовками в первой строке вашей таблицы!
const COLUMNS = {
    PAYMENT: 'Ежемесячный платеж',    // Число
    IMAGE_URL: 'Ссылка на изображение', // URL
    TITLE: 'Название',                // Текст (e.g., "3-комнатная 72,84 м²")
    PRICE: 'Цена',                    // Текст или Число (e.g., "от 29 822 735 P")
    CITY: 'Город',                    // Текст
    LINK: 'Ссылка на квартиру',       // URL (для кнопки "Хочу тут жить")
    PROGRAM: 'Программа',              // Текст (e.g., "Стандартная ипотека")
    RATE: 'Ставка'                    // Текст (e.g., "0,00%")
};

// --- Получение ссылок на элементы DOM ---
const citySelect = document.getElementById('city');
const rentInput = document.getElementById('rent');
const searchButton = document.getElementById('search-button');
const resultsContainer = document.getElementById('results');
const loadingMessage = document.getElementById('loading-message');
const noResultsMessage = document.getElementById('no-results-message');

// --- Глобальные переменные ---
let apartmentsData = []; // Массив для хранения всех загруженных данных о квартирах
let currentSlide = 0;    // Индекс текущей отображаемой карточки (слайда)

// --- Функции ---

/**
 * Переключает видимость карточек квартир, показывая только одну по индексу.
 * Обновляет состояние кнопок навигации на активной карточке.
 * @param {number} index - Индекс слайда, который нужно показать.
 */
function showSlide(index) {
    const slides = resultsContainer.querySelectorAll('.apartment-card');
    if (!slides || slides.length === 0) return; // Выход, если слайдов нет

    // Ограничиваем индекс границами [0, slides.length - 1]
    index = Math.max(0, Math.min(index, slides.length - 1));

    slides.forEach((slide, i) => {
        const isActive = (i === index);
        slide.classList.toggle('active', isActive); // Показываем или скрываем слайд

        // Обновляем состояние кнопок навигации только на активном слайде
        if (isActive) {
            const prevButton = slide.querySelector('.prev-button');
            const nextButton = slide.querySelector('.next-button');
            if (prevButton) {
                prevButton.disabled = (index === 0); // Деактивируем "Назад" на первом
            }
            if (nextButton) {
                nextButton.disabled = (index === slides.length - 1); // Деактивируем "Далее" на последнем
            }
        }
    });
    currentSlide = index; // Обновляем глобальный индекс текущего слайда
}

/**
 * Загружает данные из опубликованной Google Таблицы (TSV) и парсит их.
 * Сохраняет результат в глобальную переменную apartmentsData.
 * Обрабатывает ошибки загрузки и парсинга.
 * @returns {Promise<Array>} - Промис, который разрешается массивом объектов квартир или пустым массивом в случае ошибки.
 */
async function fetchAndParseSheet() {
    console.log("Загрузка данных из Google Sheet...");
    // Показываем индикатор загрузки и блокируем кнопку поиска
    resultsContainer.innerHTML = '';
    loadingMessage.style.display = 'block';
    noResultsMessage.style.display = 'none';
    searchButton.disabled = true;
    searchButton.textContent = 'Загрузка данных...';

    try {
        const response = await fetch(GOOGLE_SHEET_TSV_URL);
        if (!response.ok) {
            throw new Error(`Ошибка сети при загрузке таблицы: ${response.status} ${response.statusText}`);
        }
        const tsvData = await response.text();
        console.log("TSV данные получены, начало парсинга...");

        const lines = tsvData.trim().split('\n');
        if (lines.length < 2) {
            console.warn("Таблица пуста или содержит только заголовки.");
            throw new Error("Данные о квартирах не найдены в таблице.");
        }

        const headers = lines[0].split('\t').map(h => h.trim());
        console.log("Обнаруженные заголовки:", headers);

        // Проверка наличия всех необходимых столбцов
        const colIndices = {};
        let missingColumns = [];
        for (const key in COLUMNS) {
            const index = headers.indexOf(COLUMNS[key]);
            if (index === -1) {
                console.error(`Критическая ошибка: Столбец "${COLUMNS[key]}" не найден в таблице!`);
                missingColumns.push(COLUMNS[key]);
            }
            colIndices[key] = index;
        }

        // Если есть недостающие столбцы - прерываем и сообщаем
        if (missingColumns.length > 0) {
            throw new Error(`Ошибка конфигурации: следующие столбцы не найдены в Google Таблице: ${missingColumns.join(', ')}. Проверьте заголовки.`);
        }

        // Парсинг строк данных
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split('\t').map(v => v.trim());
            // Пропускаем возможные пустые строки в конце файла
            if (values.length < headers.length || values.every(v => !v)) continue;

            const row = {};
            try {
                // Извлекаем и преобразуем данные, обрабатываем возможные ошибки
                row.payment = parseFloat(values[colIndices.PAYMENT]?.replace(',', '.') || '0');
                if (isNaN(row.payment)) {
                    console.warn(`Некорректный формат платежа в строке ${i + 1}:`, values[colIndices.PAYMENT]);
                    row.payment = 0; // Используем 0 или можно пропустить строку: continue;
                }

                row.imageUrl = values[colIndices.IMAGE_URL] || '';
                row.title = values[colIndices.TITLE] || 'Нет названия';

                const priceStr = values[colIndices.PRICE] || '';
                // Пытаемся преобразовать цену в число, иначе оставляем как есть
                const parsedPrice = parseFloat(priceStr.replace(/\s/g, '').replace(',', '.')); // Удаляем пробелы, меняем запятую
                row.price = isNaN(parsedPrice) ? priceStr : parsedPrice;

                row.city = values[colIndices.CITY] || '';
                row.link = values[colIndices.LINK] || ''; // Ссылка для кнопки "Хочу тут жить"
                row.program = values[colIndices.PROGRAM] || 'Не указана';
                row.rate = values[colIndices.RATE] || 'Не указана';

                // Добавляем строку, только если указан город (или другое важное поле)
                if (row.city) {
                    data.push(row);
                } else {
                    console.warn(`Пропущена строка ${i+1} без указания города.`);
                }

            } catch (parseError) {
                console.error(`Ошибка парсинга данных в строке ${i + 1}:`, values, parseError);
                // Пропускаем строку с ошибкой
            }
        }
        console.log(`Парсинг завершен. Успешно загружено ${data.length} записей.`);
        apartmentsData = data; // Сохраняем результат в глобальную переменную

    } catch (error) {
        console.error('Критическая ошибка при загрузке или парсинге данных:', error);
        // Отображаем сообщение об ошибке пользователю
        loadingMessage.style.display = 'none';
        noResultsMessage.textContent = `Не удалось загрузить данные: ${error.message}`;
        noResultsMessage.style.display = 'block';
        apartmentsData = []; // Сбрасываем данные в случае ошибки
    } finally {
         // В любом случае убираем индикатор загрузки и разблокируем кнопку поиска
         loadingMessage.style.display = 'none';
         searchButton.disabled = false;
         searchButton.textContent = 'Продолжить';
    }
    return apartmentsData; // Возвращаем загруженные данные
}

/**
 * Фильтрует массив квартир по выбранному городу и максимальной арендной плате.
 * @param {string} city - Выбранный город.
 * @param {number|string} maxRent - Введенная максимальная арендная плата.
 * @returns {Array} - Отфильтрованный массив объектов квартир.
 */
function filterApartments(city, maxRent) {
    console.log(`Фильтрация: Город="${city}", макс. аренда=${maxRent}`);
    if (!apartmentsData || apartmentsData.length === 0) {
        console.warn("Нет данных для фильтрации.");
        return [];
    }

    const rent = parseFloat(maxRent);
    if (isNaN(rent)) {
        console.error("Некорректное значение максимальной аренды для фильтрации.");
        // Можно показать alert или просто вернуть пустой массив
        // alert("Введите корректную сумму аренды.");
        return [];
    }

    const filtered = apartmentsData.filter(apt => {
        // Сравнение города без учета регистра и лишних пробелов
        const cityMatch = apt.city.trim().toLowerCase() === city.trim().toLowerCase();
        // Сравнение платежа по ипотеке с арендной платой
        const paymentMatch = apt.payment <= rent;
        return cityMatch && paymentMatch;
    });
    console.log(`Найдено ${filtered.length} подходящих квартир.`);
    return filtered;
}

/**
 * Отображает отфильтрованные квартиры в виде карточек-слайдов.
 * Создает структуру карточки согласно дизайну.
 * @param {Array} apartments - Массив отфильтрованных объектов квартир.
 */
function displayApartments(apartments) {
    resultsContainer.innerHTML = ''; // Очищаем предыдущие результаты

    if (!apartments || apartments.length === 0) {
        noResultsMessage.textContent = 'Подходящих квартир не найдено.';
        noResultsMessage.style.display = 'block';
        loadingMessage.style.display = 'none';
        return;
    }

    // Скрываем сообщения об отсутствии результатов и загрузке
    noResultsMessage.style.display = 'none';
    loadingMessage.style.display = 'none';

    // Создаем HTML для каждой карточки
    apartments.forEach((apt, index) => {
        const card = document.createElement('div');
        card.className = 'apartment-card'; // Карточки скрыты по умолчанию CSS
        card.dataset.index = index; // Сохраняем индекс для отладки или др. целей

        // 1. Изображение
        if (apt.imageUrl) {
            const img = document.createElement('img');
            img.src = apt.imageUrl;
            img.alt = apt.title;
            img.onerror = (e) => { e.target.style.display = 'none'; console.warn(`Не удалось загрузить изображение: ${apt.imageUrl}`); }; // Скрываем при ошибке загрузки
            card.appendChild(img);
        }

        // 2. Заголовок (Название)
        const title = document.createElement('h3');
        title.className = 'apartment-title';
        title.textContent = apt.title;
        card.appendChild(title);

        // 3. Цена
        const priceP = document.createElement('p');
        priceP.className = 'apartment-price';
        const priceValue = typeof apt.price === 'number'
            // Форматируем числовую цену
            ? `от ${Math.round(apt.price).toLocaleString('ru-RU')} ₽`
            // Отображаем как есть, если это текст (например, "Цена по запросу")
            : apt.price || 'Цена не указана';
        priceP.textContent = priceValue;
        card.appendChild(priceP);

        // 4. Блок с деталями ипотеки (Программа, Ставка, Платеж)
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'details-section';
        detailsDiv.innerHTML = `
            <div class="detail-row">
                <span class="icon">📋</span>
                <span class="label">Программа</span>
                <span class="value">${apt.program}</span>
            </div>
            <div class="detail-row">
                <span class="icon">%</span>
                <span class="label">Ставка</span>
                <span class="value">${apt.rate}</span>
            </div>
            <div class="detail-row">
                <span class="icon">💰</span>
                <span class="label">Ежемесячный платёж</span>
                <span class="value">${apt.payment ? Math.round(apt.payment).toLocaleString('ru-RU') + ' ₽' : 'не указан'}</span>
            </div>
        `;
        card.appendChild(detailsDiv);

        // 5. Дисклеймер
        const disclaimer = document.createElement('p');
        disclaimer.className = 'disclaimer';
        // Ссылка в дисклеймере - можно сделать ее динамической из таблицы, если нужно
        disclaimer.innerHTML = 'Для получения актуальной информации<br>по предложениям зайдите на <a href="https://ugmkstroy.ru" target="_blank" rel="noopener noreferrer">pik.ru</a>.';
        card.appendChild(disclaimer);

        // 6. Кнопка "Хочу тут жить" (ссылка на внешний сайт)
        if (apt.link) { // Показываем кнопку только если ссылка есть в данных
            const actionLink = document.createElement('a');
            actionLink.className = 'main-action-button';
            actionLink.href = apt.link;
            actionLink.target = '_blank'; // Открывать в новой вкладке/браузере
            actionLink.rel = 'noopener noreferrer'; // Рекомендация по безопасности для target="_blank"
            actionLink.textContent = 'Хочу тут жить';
            card.appendChild(actionLink);
        } else {
            // Можно добавить пустой div для сохранения высоты, если ссылки нет
            const placeholderDiv = document.createElement('div');
            placeholderDiv.style.height = '46px'; // Примерная высота оранжевой кнопки + margin
            placeholderDiv.style.marginTop = '15px';
            card.appendChild(placeholderDiv);
            console.warn(`Нет ссылки 'Ссылка на квартиру' для карточки: ${apt.title}`);
        }

        // 7. Контейнер для кнопок навигации ("Назад" / "Далее")
        const navigationDiv = document.createElement('div');
        navigationDiv.className = 'navigation-buttons';

        // 7.1 Кнопка "Назад"
        const prevButton = document.createElement('button');
        prevButton.className = 'prev-button navigation-button';
        prevButton.textContent = '⬅️ Назад';
        prevButton.type = 'button'; // Явно указываем тип для кнопки
        prevButton.onclick = () => { showSlide(currentSlide - 1); };
        navigationDiv.appendChild(prevButton);

        // 7.2 Кнопка "Далее"
        const nextButton = document.createElement('button');
        nextButton.className = 'next-button navigation-button';
        nextButton.textContent = 'Далее ➡️';
        nextButton.type = 'button';
        nextButton.onclick = () => { showSlide(currentSlide + 1); };
        navigationDiv.appendChild(nextButton);

        // Добавляем контейнер с кнопками навигации в карточку
        card.appendChild(navigationDiv);

        // Добавляем полностью собранную карточку в контейнер результатов
        resultsContainer.appendChild(card);
    });

    // После добавления всех карточек, показываем первую
    if (apartments.length > 0) {
        showSlide(0);
    }
}


// --- Обработчики событий ---

// Обработчик клика на кнопку "Продолжить" (Поиск)
searchButton.addEventListener('click', async () => {
    const city = citySelect.value;
    const rent = rentInput.value;

    // Валидация ввода
    if (!city) {
        alert('Пожалуйста, выберите город.');
        return;
    }
    if (rent === '' || parseFloat(rent) < 0) { // Проверяем и на пустоту
        alert('Пожалуйста, введите корректную сумму аренды (0 или больше).');
        return;
    }

    // Показываем индикатор загрузки (если данные еще не загружены)
    // или просто выполняем фильтрацию
    searchButton.disabled = true;
    searchButton.textContent = 'Идет поиск...';
    loadingMessage.style.display = 'block'; // Показываем на время фильтрации тоже
    resultsContainer.innerHTML = '';        // Очищаем результаты перед новым поиском
    noResultsMessage.style.display = 'none';

    try {
        // Проверяем, были ли данные загружены ранее
        // Если нет (например, ошибка при старте), пытаемся загрузить снова
        if (!apartmentsData || apartmentsData.length === 0) {
            console.log("Данные не были загружены ранее, попытка загрузки перед поиском...");
            await fetchAndParseSheet(); // Эта функция сама обработает ошибки и обновит UI
            // Если после попытки данных всё еще нет, прекращаем поиск
            if (!apartmentsData || apartmentsData.length === 0) {
                console.error("Не удалось выполнить поиск: данные о квартирах отсутствуют.");
                // Сообщение об ошибке уже должно быть показано fetchAndParseSheet
                searchButton.disabled = false; // Возвращаем кнопку в исходное состояние
                searchButton.textContent = 'Продолжить';
                loadingMessage.style.display = 'none'; // Скрываем загрузку
                return;
            }
        }

        // Фильтруем загруженные (или только что загруженные) данные
        const filteredResults = filterApartments(city, rent);

        // Небольшая задержка для имитации "поиска" и чтобы пользователь увидел индикатор
        await new Promise(resolve => setTimeout(resolve, 150)); // 150ms задержка

        // Отображаем результаты
        displayApartments(filteredResults);

    } catch (error) {
        // Ловим другие возможные ошибки на этапе поиска/отображения
        console.error("Ошибка во время поиска или отображения:", error);
        noResultsMessage.textContent = `Произошла ошибка: ${error.message}`;
        noResultsMessage.style.display = 'block';
    } finally {
        // Убедимся, что UI в порядке после поиска
        loadingMessage.style.display = 'none';
        searchButton.disabled = false;
        searchButton.textContent = 'Продолжить';
    }
});

// Предварительная загрузка данных при загрузке страницы Mini App
document.addEventListener('DOMContentLoaded', () => {
    console.log("Mini App загружен. Запуск предварительной загрузки данных...");
    // Запускаем загрузку в фоне, не блокируя интерфейс
    fetchAndParseSheet().then((data) => {
        if (data && data.length > 0) {
            console.log("Предварительная загрузка данных успешно завершена.");
        } else {
            console.warn("Предварительная загрузка данных завершилась, но данных нет или произошла ошибка.");
             // Сообщение об ошибке/отсутствии данных уже должно быть отображено функцией fetchAndParseSheet
        }
    }).catch(error => {
        // Эта ошибка будет поймана и обработана внутри fetchAndParseSheet
        console.error("Не удалось выполнить предварительную загрузку:", error);
    });
});

// Обработка изменения темы Telegram (опционально, для адаптации стилей)
tg.onEvent('themeChanged', function() {
  console.log('Тема Telegram изменена:', tg.themeParams);
  // Пример обновления стилей:
  document.body.style.backgroundColor = tg.themeParams.bg_color || '#ffffff'; // Добавляем fallback
  document.body.style.color = tg.themeParams.text_color || '#000000';
  // Можно обновлять и другие стили элементов, если нужно
  // Например, цвет фона input-ов, кнопок и т.д., если не используются переменные CSS
});

// --- Конец скрипта ---
