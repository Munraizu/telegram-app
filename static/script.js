const tg = window.Telegram.WebApp;

// URL вашей опубликованной Google Таблицы в формате TSV
// УБЕДИТЕСЬ, ЧТО ОНА ОПУБЛИКОВАНА КАК TSV И ССЫЛКА АКТУАЛЬНА
const GOOGLE_SHEET_TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRzFm-I4hL8tKOSXOsW-yeg4N2-WJfA9aLBXfxf4pF6pvGQFPbnj1fTztVWTQVkS9q-seBCXLMx07Z9/pub?output=tsv';

// Обновленный список колонок - ПРОВЕРЬТЕ ТОЧНОЕ СООТВЕТСТВИЕ С ВАШЕЙ ТАБЛИЦЕЙ!
const COLUMNS = {
    PAYMENT: 'Ежемесячный платеж', // Число
    IMAGE_URL: 'Ссылка на изображение', // URL
    TITLE: 'Название',             // Текст (e.g., "3-комнатная 72,84 м²")
    PRICE: 'Цена',                 // Текст или Число (e.g., "от 29 822 735 P")
    CITY: 'Город',                 // Текст
    LINK: 'Ссылка на квартиру',    // URL
    PROGRAM: 'Программа',           // Текст (e.g., "Стандартная ипотека")
    RATE: 'Ставка'                 // Текст (e.g., "0,00%") - оставляем текстом
};

// Инициализация Web App
tg.ready();
tg.expand(); // Расширяем приложение

// --- Получаем элементы DOM ---
const citySelect = document.getElementById('city');
const rentInput = document.getElementById('rent');
const searchButton = document.getElementById('search-button');
const resultsContainer = document.getElementById('results');
const loadingMessage = document.getElementById('loading-message');
const noResultsMessage = document.getElementById('no-results-message');

let apartmentsData = []; // Массив для хранения данных из таблицы
let currentSlide = 0;    // Индекс текущего слайда

// --- Функция переключения слайдов (остается похожей) ---
function showSlide(index) {
    const slides = resultsContainer.querySelectorAll('.apartment-card');
    if (!slides || slides.length === 0) return;

    // Обеспечиваем зацикливание или остановку на последнем слайде
    // В дизайне нет кнопки "Назад", поэтому просто идем вперед.
    // Если нужно зацикливание: index = index % slides.length;
    // Если нужно остановиться: index = Math.min(index, slides.length - 1);
    // Выберем остановку на последнем:
    index = Math.max(0, Math.min(index, slides.length - 1));

    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
        // Обновляем состояние кнопки "Следующая" на активном слайде
        const nextButton = slide.querySelector('.next-button');
        if (nextButton) {
            nextButton.disabled = (i === slides.length - 1); // Деактивируем на последнем
        }
    });
    currentSlide = index;
}

// --- Обновленная функция загрузки и парсинга TSV ---
async function fetchAndParseSheet() {
    console.log("Загрузка данных из Google Sheet...");
    resultsContainer.innerHTML = ''; // Очистка перед загрузкой
    loadingMessage.style.display = 'block';
    noResultsMessage.style.display = 'none';
    searchButton.disabled = true;
    searchButton.textContent = 'Загрузка данных...';

    try {
        const response = await fetch(GOOGLE_SHEET_TSV_URL);
        if (!response.ok) {
            throw new Error(`Ошибка загрузки таблицы: ${response.status} ${response.statusText}`);
        }
        const tsvData = await response.text();
        console.log("TSV данные получены, парсинг...");

        const lines = tsvData.trim().split('\n');
        if (lines.length < 2) {
            console.warn("Таблица пуста или содержит только заголовки.");
            apartmentsData = [];
            loadingMessage.style.display = 'none';
            noResultsMessage.textContent = "Данные о квартирах не найдены в таблице.";
            noResultsMessage.style.display = 'block';
            searchButton.disabled = false; // Разблокируем кнопку, чтобы можно было попробовать снова
            searchButton.textContent = 'Продолжить';
            return apartmentsData;
        }

        const headers = lines[0].split('\t').map(h => h.trim());
        console.log("Заголовки:", headers);

        // Находим индексы нужных столбцов
        const colIndices = {};
        let missingColumns = [];
        for (const key in COLUMNS) {
            const index = headers.indexOf(COLUMNS[key]);
            if (index === -1) {
                console.error(`Ошибка: Столбец "${COLUMNS[key]}" не найден в таблице!`);
                missingColumns.push(COLUMNS[key]);
            }
            colIndices[key] = index;
        }

        // Если есть недостающие столбцы - прерываем и сообщаем
        if (missingColumns.length > 0) {
            alert(`Ошибка конфигурации: следующие столбцы не найдены в Google Таблице: ${missingColumns.join(', ')}. Проверьте заголовки.`);
             apartmentsData = [];
             loadingMessage.style.display = 'none';
             noResultsMessage.textContent = "Ошибка чтения данных: не найдены необходимые столбцы.";
             noResultsMessage.style.display = 'block';
             searchButton.disabled = false;
             searchButton.textContent = 'Продолжить';
             return apartmentsData;
        }

        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split('\t').map(v => v.trim());
            // Пропускаем пустые строки, если они есть
            if (values.length < headers.length || values.every(v => !v)) continue;

            const row = {};
            try {
                // Извлекаем и преобразуем данные
                row.payment = parseFloat(values[colIndices.PAYMENT]?.replace(',', '.') || '0');
                row.imageUrl = values[colIndices.IMAGE_URL] || '';
                row.title = values[colIndices.TITLE] || 'Нет названия';
                const priceStr = values[colIndices.PRICE] || '';
                row.price = isNaN(parseFloat(priceStr.replace(',', '.'))) ? priceStr : parseFloat(priceStr.replace(',', '.'));
                row.city = values[colIndices.CITY] || '';
                row.link = values[colIndices.LINK] || ''; // Ссылка на квартиру
                row.program = values[colIndices.PROGRAM] || 'Не указана'; // Программа
                row.rate = values[colIndices.RATE] || 'Не указана'; // Ставка

                // Проверяем, что платеж - это число
                if (isNaN(row.payment)) {
                    console.warn(`Не удалось преобразовать платеж в число в строке ${i + 1}:`, values[colIndices.PAYMENT]);
                    row.payment = 0; // Ставим 0 или пропускаем? Решаем ставить 0 для возможности фильтрации
                }

                if (row.city) { // Добавляем только если есть город
                    data.push(row);
                } else {
                    console.warn(`Пропущена строка ${i+1} без указания города.`);
                }

            } catch (e) {
                console.error(`Ошибка парсинга строки ${i + 1}:`, values, e);
                // Пропускаем строку с ошибкой
            }
        }
        console.log(`Парсинг завершен. Загружено ${data.length} записей.`);
        apartmentsData = data; // Сохраняем данные глобально

    } catch (error) {
        console.error('Ошибка при загрузке или парсинге данных:', error);
        alert(`Не удалось загрузить данные из таблицы: ${error.message}`);
        apartmentsData = []; // Возвращаем пустой массив в случае ошибки
        noResultsMessage.textContent = `Ошибка загрузки данных: ${error.message}`;
        noResultsMessage.style.display = 'block';
    } finally {
         // Убираем сообщение о загрузке и разблокируем кнопку в любом случае
         loadingMessage.style.display = 'none';
         searchButton.disabled = false;
         searchButton.textContent = 'Продолжить';
    }
    return apartmentsData;
}

// --- Функция фильтрации данных (без изменений) ---
function filterApartments(city, maxRent) {
    console.log(`Фильтрация: Город="${city}", макс. аренда=${maxRent}`);
    if (!apartmentsData || apartmentsData.length === 0) {
        console.log("Нет данных для фильтрации.");
        return [];
    }

    const rent = parseFloat(maxRent);
    if (isNaN(rent)) {
        console.error("Некорректное значение максимальной аренды для фильтрации.");
        alert("Введите корректную сумму аренды.");
        return [];
    }

    const filtered = apartmentsData.filter(apt => {
        const cityMatch = apt.city.trim().toLowerCase() === city.trim().toLowerCase();
        const paymentMatch = apt.payment <= rent;
        return cityMatch && paymentMatch;
    });
    console.log(`Найдено ${filtered.length} подходящих квартир.`);
    return filtered;
}


// --- НОВАЯ Функция отображения квартир ---
function displayApartments(apartments) {
    resultsContainer.innerHTML = ''; // Очищаем старые результаты

    if (apartments.length === 0) {
        noResultsMessage.style.display = 'block';
        loadingMessage.style.display = 'none';
        return;
    }

    noResultsMessage.style.display = 'none';
    loadingMessage.style.display = 'none';

    apartments.forEach((apt, index) => {
        const card = document.createElement('div');
        card.className = 'apartment-card'; // Будет скрыт CSS по умолчанию
        card.dataset.index = index;

        // 1. Изображение (если есть)
        if (apt.imageUrl) {
            const img = document.createElement('img');
            img.src = apt.imageUrl;
            img.alt = apt.title;
            img.onerror = () => { img.style.display = 'none'; }; // Скрываем при ошибке
            card.appendChild(img);
        }

        // 2. Заголовок (Название квартиры)
        const title = document.createElement('h3');
        title.className = 'apartment-title';
        title.textContent = apt.title;
        card.appendChild(title);

        // 3. Цена
        const priceP = document.createElement('p');
        priceP.className = 'apartment-price';
        const priceValue = typeof apt.price === 'number'
             ? `от ${Math.round(apt.price).toLocaleString('ru-RU')} ₽`
             : apt.price; // Отображаем как текст, если не число
        priceP.textContent = priceValue;
        card.appendChild(priceP);

        // 4. Блок с деталями (Программа, Ставка, Платеж)
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'details-section';

        // 4.1 Программа
        const programRow = document.createElement('div');
        programRow.className = 'detail-row';
        programRow.innerHTML = `
            <span class="icon">📋</span>
            <span class="label">Программа</span>
            <span class="value">${apt.program}</span>
        `;
        detailsDiv.appendChild(programRow);

        // 4.2 Ставка
        const rateRow = document.createElement('div');
        rateRow.className = 'detail-row';
        rateRow.innerHTML = `
            <span class="icon">%</span>
            <span class="label">Ставка</span>
            <span class="value">${apt.rate}</span>
        `;
        detailsDiv.appendChild(rateRow);

        // 4.3 Ежемесячный платеж
        const paymentRow = document.createElement('div');
        paymentRow.className = 'detail-row';
        const paymentValue = apt.payment ? `${Math.round(apt.payment).toLocaleString('ru-RU')} ₽` : 'не указан';
        paymentRow.innerHTML = `
            <span class="icon">💰</span>
            <span class="label">Ежемесячный платёж</span>
            <span class="value">${paymentValue}</span>
        `;
        detailsDiv.appendChild(paymentRow);

        card.appendChild(detailsDiv);

        // 5. Дисклеймер
        const disclaimer = document.createElement('p');
        disclaimer.className = 'disclaimer';
        // Можно сделать ссылку кликабельной, если нужно
        disclaimer.innerHTML = 'Для получения актуальной информации<br>по предложениям зайдите на <a href="https://pik.ru" target="_blank">pik.ru</a>.'; // Пример ссылки
        card.appendChild(disclaimer);

        // 6. Кнопка "Хочу тут жить" (ссылка)
        if (apt.link) { // Показываем кнопку только если ссылка есть
            const actionLink = document.createElement('a');
            actionLink.className = 'main-action-button';
            actionLink.href = apt.link;
            actionLink.target = '_blank'; // Открывать в новой вкладке
            actionLink.textContent = 'Хочу тут жить';
            card.appendChild(actionLink);
        } else {
            const placeholderDiv = document.createElement('div'); // Заглушка, если ссылки нет
             placeholderDiv.style.height = '46px'; // Примерная высота кнопки для сохранения разметки
             placeholderDiv.style.marginTop = '15px';
             card.appendChild(placeholderDiv);
        }

        // 7. Кнопка "Следующая квартира"
        const nextButton = document.createElement('button');
        nextButton.className = 'next-button';
        nextButton.textContent = 'Следующая квартира';
        nextButton.onclick = () => {
             showSlide(currentSlide + 1);
        };
        // Деактивируем сразу, если это последний слайд (на всякий случай, хотя showSlide тоже это сделает)
        if (index === apartments.length - 1) {
             nextButton.disabled = true;
        }
        card.appendChild(nextButton);

        // Добавляем готовую карточку в контейнер
        resultsContainer.appendChild(card);
    });

    // Показываем первый слайд, если есть результаты
    if (apartments.length > 0) {
        showSlide(0);
    }
}


// --- Основная логика при клике на кнопку "Продолжить" ---
searchButton.addEventListener('click', async () => {
    const city = citySelect.value;
    const rent = rentInput.value;

    if (!city) {
        alert('Пожалуйста, выберите город.');
        return;
    }
    if (!rent || parseFloat(rent) < 0) {
        alert('Пожалуйста, введите корректную сумму аренды.');
        return;
    }

    // Показываем загрузку, скрываем старые результаты/сообщения
    resultsContainer.innerHTML = ''; // Очищаем полностью
    loadingMessage.style.display = 'block';
    noResultsMessage.style.display = 'none';
    searchButton.disabled = true;
    searchButton.textContent = 'Идет поиск...';

    try {
        // Данные должны были загрузиться при старте или предыдущем поиске
        // Если нет - попробуем загрузить снова (на случай ошибки при старте)
        if (apartmentsData.length === 0) {
            console.log("Данные не были загружены ранее, попытка загрузки...");
            await fetchAndParseSheet(); // fetchAndParseSheet сам обновит кнопку и сообщения
            if (apartmentsData.length === 0) {
                 console.log("Данные все еще не загружены после попытки.");
                 // Сообщение об ошибке уже должно быть показано функцией fetchAndParseSheet
                 return; // Выход, если данных так и нет
            }
        }

        // Фильтруем загруженные данные
        const filteredResults = filterApartments(city, rent);

        // Отображаем результаты
        displayApartments(filteredResults);

    } catch (error) {
        // На случай непредвиденных ошибок здесь
        console.error("Непредвиденная ошибка при поиске:", error);
        loadingMessage.style.display = 'none';
        noResultsMessage.textContent = `Произошла ошибка: ${error.message}`;
        noResultsMessage.style.display = 'block';
    } finally {
         // Убедимся что кнопка поиска снова активна (если не была обновлена в fetchAndParseSheet)
         if (!searchButton.disabled) {
             searchButton.disabled = false;
             searchButton.textContent = 'Продолжить'; // Или 'Искать снова'
         }
    }
});

// --- Загрузка данных при старте приложения ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Mini App загружен. Предварительная загрузка данных...");
    // Не блокируем интерфейс, просто запускаем загрузку в фоне
    fetchAndParseSheet().then(() => {
        console.log("Предварительная загрузка данных завершена.");
        // Можно здесь уже показать какие-то элементы интерфейса, если нужно
    }).catch(error => {
        console.error("Ошибка при предварительной загрузке:", error);
        // Сообщение об ошибке уже должно быть показано функцией fetchAndParseSheet
    });
});

// Слушатель изменения темы Telegram (без изменений)
tg.onEvent('themeChanged', function() {
  document.body.style.backgroundColor = tg.themeParams.bg_color;
  document.body.style.color = tg.themeParams.text_color;
  // Обновите стили других элементов при необходимости
});
