// --- Инициализация Telegram Web App ---
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// --- Конфигурация ---

// !!! ВАЖНО: Замените на URL вашей опубликованной Google Таблицы в формате TSV
const GOOGLE_SHEET_TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRzFm-I4hL8tKOSXOsW-yeg4N2-WJfA9aLBXfxf4pF6pvGQFPbnj1fTztVWTQVkS9q-seBCXLMx07Z9/pub?output=tsv';

// !!! ВАЖНО: Имена ключей должны ТОЧНО совпадать с заголовками столбцов в первой строке вашей таблицы!
const COLUMNS = {
    PAYMENT: 'Ежемесячный платеж',    // Число
    IMAGE_URL: 'Ссылка на изображение', // URL
    TITLE: 'Название',                // Текст
    PRICE: 'Цена',                    // Текст или Число
    CITY: 'Город',                    // Текст
    LINK: 'Ссылка на квартиру',       // URL (для кнопки "Хочу тут жить")
    PROGRAM: 'Программа',              // Текст
    RATE: 'Ставка'                    // Текст
    // ID: 'Уникальный ID'            // Раскомментируйте и настройте, если используете ID
};

// --- Получение ссылок на элементы DOM ---
const citySelect = document.getElementById('city');
const rentInput = document.getElementById('rent');
const searchButton = document.getElementById('search-button');
const resultsContainer = document.getElementById('results');
const loadingMessage = document.getElementById('loading-message');
const noResultsMessage = document.getElementById('no-results-message');

// --- Глобальные переменные ---
let apartmentsData = []; // Кэш для загруженных данных
let currentSlide = 0;    // Индекс активного слайда

// --- Функции ---

/**
 * Отображает слайд (карточку квартиры) по указанному индексу.
 * Управляет состоянием кнопок навигации на активном слайде.
 * @param {number} index - Целевой индекс слайда.
 */
function showSlide(index) {
    const slides = resultsContainer.querySelectorAll('.apartment-card');
    if (!slides || slides.length === 0) return;

    // Ограничиваем индекс допустимым диапазоном
    index = Math.max(0, Math.min(index, slides.length - 1));

    slides.forEach((slide, i) => {
        const isActive = (i === index);
        slide.classList.toggle('active', isActive);

        // Обновляем состояние кнопок Назад/Далее только на активном слайде
        if (isActive) {
            const prevButton = slide.querySelector('.prev-button');
            const nextButton = slide.querySelector('.next-button');
            if (prevButton) prevButton.disabled = (index === 0);
            if (nextButton) nextButton.disabled = (index === slides.length - 1);
        }
    });
    currentSlide = index;
}

/**
 * Асинхронно загружает и парсит данные из Google Sheets (TSV).
 * Обрабатывает ошибки сети и парсинга, проверяет наличие необходимых столбцов.
 * Обновляет глоб. переменную apartmentsData и состояние UI (загрузка, ошибки).
 * @returns {Promise<Array>} Массив объектов квартир или пустой массив.
 */
async function fetchAndParseSheet() {
    console.log("Загрузка данных из Google Sheet...");
    resultsContainer.innerHTML = '';
    loadingMessage.style.display = 'block';
    noResultsMessage.style.display = 'none';
    searchButton.disabled = true;
    searchButton.textContent = 'Загрузка данных...';

    try {
        const response = await fetch(GOOGLE_SHEET_TSV_URL);
        if (!response.ok) throw new Error(`Ошибка сети: ${response.status} ${response.statusText}`);

        const tsvData = await response.text();
        console.log("TSV данные получены, парсинг...");
        const lines = tsvData.trim().split('\n');
        if (lines.length < 2) throw new Error("Таблица пуста или содержит только заголовки.");

        const headers = lines[0].split('\t').map(h => h.trim());
        console.log("Обнаруженные заголовки:", headers);

        // Проверка наличия всех колонок, определенных в COLUMNS
        const colIndices = {};
        let missingColumns = [];
        for (const key in COLUMNS) {
            if (!COLUMNS[key]) continue;
            const index = headers.indexOf(COLUMNS[key]);
            if (index === -1) missingColumns.push(COLUMNS[key]);
            colIndices[key] = index;
        }
        if (missingColumns.length > 0) {
            throw new Error(`Ошибка конфигурации: столбцы не найдены: ${missingColumns.join(', ')}`);
        }

        // Парсинг строк
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split('\t').map(v => v.trim());
            if (values.length < headers.length || values.every(v => !v)) continue; // Пропуск пустых строк

            const row = {};
            try {
                // Извлечение и преобразование данных
                row.payment = parseFloat(values[colIndices.PAYMENT]?.replace(',', '.') || '0');
                if (isNaN(row.payment)) row.payment = 0; // Обработка некорректного платежа

                row.imageUrl = values[colIndices.IMAGE_URL] || '';
                row.title = values[colIndices.TITLE] || 'Нет названия';

                const priceStr = values[colIndices.PRICE] || '';
                // Удаляем пробелы в цене перед парсингом
                const parsedPrice = parseFloat(priceStr.replace(/\s/g, '').replace(',', '.'));
                row.price = isNaN(parsedPrice) ? priceStr : parsedPrice; // Цена может быть числом или текстом

                row.city = values[colIndices.CITY] || '';
                row.link = values[colIndices.LINK] || '';
                row.program = values[colIndices.PROGRAM] || 'Не указана';
                row.rate = values[colIndices.RATE] || 'Не указана';
                // row.id = values[colIndices.ID] || null; // Пример парсинга ID

                // Добавляем только если есть город (или другое обязательное поле)
                if (row.city) data.push(row);

            } catch (parseError) {
                console.error(`Ошибка парсинга строки ${i + 1}:`, values, parseError);
            }
        }
        console.log(`Парсинг завершен. Загружено ${data.length} записей.`);
        apartmentsData = data;

    } catch (error) {
        console.error('Ошибка при загрузке/парсинге:', error);
        loadingMessage.style.display = 'none';
        noResultsMessage.textContent = `Ошибка загрузки данных: ${error.message}`;
        noResultsMessage.style.display = 'block';
        apartmentsData = [];
    } finally {
         loadingMessage.style.display = 'none';
         searchButton.disabled = false;
         searchButton.textContent = 'Продолжить';
    }
    return apartmentsData;
}

/**
 * Фильтрует кэшированный массив apartmentsData по городу и макс. аренде.
 * @param {string} city - Выбранный город.
 * @param {number|string} maxRent - Макс. арендная плата.
 * @returns {Array} Отфильтрованный массив квартир.
 */
function filterApartments(city, maxRent) {
    console.log(`Фильтрация: Город="${city}", макс. аренда=${maxRent}`);
    if (!apartmentsData || apartmentsData.length === 0) return [];

    const rent = parseFloat(maxRent);
    if (isNaN(rent)) return []; // Игнорируем нечисловую аренду

    return apartmentsData.filter(apt => {
        const cityMatch = apt.city.trim().toLowerCase() === city.trim().toLowerCase();
        const paymentMatch = apt.payment <= rent;
        return cityMatch && paymentMatch;
    });
}

/**
 * Создает и отображает HTML-карточки для переданного массива квартир.
 * @param {Array} apartments - Массив объектов квартир для отображения.
 */
function displayApartments(apartments) {
    resultsContainer.innerHTML = '';

    if (!apartments || apartments.length === 0) {
        noResultsMessage.textContent = 'Подходящих квартир не найдено.';
        noResultsMessage.style.display = 'block';
        loadingMessage.style.display = 'none';
        return;
    }

    noResultsMessage.style.display = 'none';
    loadingMessage.style.display = 'none';

    apartments.forEach((apt, index) => {
        const card = document.createElement('div');
        card.className = 'apartment-card';
        card.dataset.index = index;

        // Изображение
        if (apt.imageUrl) {
            const img = document.createElement('img');
            img.src = apt.imageUrl;
            img.alt = apt.title;
            img.loading = 'lazy';
            img.onerror = (e) => { e.target.style.display = 'none'; console.warn(`Не удалось загрузить: ${apt.imageUrl}`); };
            card.appendChild(img);
        }

        // Заголовок
        const title = document.createElement('h3');
        title.className = 'apartment-title';
        title.textContent = apt.title;
        card.appendChild(title);

        // Цена
        const priceP = document.createElement('p');
        priceP.className = 'apartment-price';
        const priceValue = typeof apt.price === 'number'
            ? `от ${Math.round(apt.price).toLocaleString('ru-RU')} ₽`
            : apt.price || 'Цена не указана';
        priceP.textContent = priceValue;
        card.appendChild(priceP);

        // Блок деталей
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'details-section';
        detailsDiv.innerHTML = `
            <div class="detail-row"><span class="icon">📋</span><span class="label">Программа</span><span class="value">${apt.program}</span></div>
            <div class="detail-row"><span class="icon">%</span><span class="label">Ставка</span><span class="value">${apt.rate}</span></div>
            <div class="detail-row"><span class="icon">💰</span><span class="label">Ежемесячный платёж</span><span class="value">${apt.payment ? Math.round(apt.payment).toLocaleString('ru-RU') + ' ₽' : 'не указан'}</span></div>`;
        card.appendChild(detailsDiv);

        // Дисклеймер
        const disclaimer = document.createElement('p');
        disclaimer.className = 'disclaimer';
        disclaimer.innerHTML = 'Для получения актуальной информации<br>по предложениям зайдите на <a href="https://pik.ru" target="_blank" rel="noopener noreferrer">pik.ru</a>.';
        card.appendChild(disclaimer);

        // Кнопка "Хочу тут жить" (внешняя ссылка)
        if (apt.link) {
            const actionLink = document.createElement('a');
            actionLink.className = 'main-action-button';
            actionLink.href = apt.link;
            actionLink.target = '_blank';
            actionLink.rel = 'noopener noreferrer';
            actionLink.textContent = 'Хочу тут жить';
            card.appendChild(actionLink);
        } else {
             // Добавляем заглушку для сохранения высоты, если ссылки нет
             const placeholderDiv = document.createElement('div');
             placeholderDiv.style.height = '46px';
             placeholderDiv.style.marginTop = '15px';
             card.appendChild(placeholderDiv);
        }

         // Кнопка "Оставить заявку" (отправка данных боту)
        const applyButton = document.createElement('button');
        applyButton.className = 'apply-button';
        applyButton.textContent = 'Оставить заявку';
        applyButton.type = 'button';
        applyButton.onclick = () => {
            // Отправляем данные о выбранной квартире боту
            const dataToSend = { action: 'apply', apartmentTitle: apt.title /*, apartmentId: apt.id */ };
            console.log('Отправка данных боту:', JSON.stringify(dataToSend));
            try {
                // Важно: sendData может закрыть Mini App
                tg.sendData(JSON.stringify(dataToSend));
            } catch (error) {
                 console.error("Ошибка tg.sendData:", error);
                 alert("Не удалось отправить заявку.");
            }
        };
        card.appendChild(applyButton);

        // Контейнер кнопок навигации
        const navigationDiv = document.createElement('div');
        navigationDiv.className = 'navigation-buttons';

        // Кнопка "Назад"
        const prevButton = document.createElement('button');
        prevButton.className = 'prev-button navigation-button';
        prevButton.textContent = '⬅️ Назад';
        prevButton.type = 'button';
        prevButton.onclick = () => { showSlide(currentSlide - 1); };
        navigationDiv.appendChild(prevButton);

        // Кнопка "Далее"
        const nextButton = document.createElement('button');
        nextButton.className = 'next-button navigation-button';
        nextButton.textContent = 'Далее ➡️';
        nextButton.type = 'button';
        nextButton.onclick = () => { showSlide(currentSlide + 1); };
        navigationDiv.appendChild(nextButton);

        card.appendChild(navigationDiv);
        resultsContainer.appendChild(card);
    });

    // Показываем первый слайд
    if (apartments.length > 0) {
        showSlide(0);
    }
}

// --- Обработчики событий ---

// Клик на кнопку "Продолжить" (Поиск)
searchButton.addEventListener('click', async () => {
    const city = citySelect.value;
    const rent = rentInput.value;

    if (!city) return alert('Пожалуйста, выберите город.');
    if (rent === '' || parseFloat(rent) < 0) return alert('Введите корректную сумму аренды.');

    searchButton.disabled = true;
    searchButton.textContent = 'Идет поиск...';
    loadingMessage.style.display = 'block';
    resultsContainer.innerHTML = '';
    noResultsMessage.style.display = 'none';

    try {
        // Гарантируем, что данные загружены перед фильтрацией
        if (!apartmentsData || apartmentsData.length === 0) {
            console.log("Данные не загружены, попытка загрузки перед поиском...");
            await fetchAndParseSheet();
            if (!apartmentsData || apartmentsData.length === 0) {
                console.error("Поиск невозможен: данные о квартирах отсутствуют.");
                searchButton.disabled = false;
                searchButton.textContent = 'Продолжить';
                loadingMessage.style.display = 'none';
                return;
            }
        }

        const filteredResults = filterApartments(city, rent);
        await new Promise(resolve => setTimeout(resolve, 150)); // Имитация поиска
        displayApartments(filteredResults);

    } catch (error) {
        console.error("Ошибка при поиске/отображении:", error);
        noResultsMessage.textContent = `Произошла ошибка: ${error.message}`;
        noResultsMessage.style.display = 'block';
    } finally {
        loadingMessage.style.display = 'none';
        searchButton.disabled = false;
        searchButton.textContent = 'Продолжить';
    }
});

// Предварительная загрузка данных при старте
document.addEventListener('DOMContentLoaded', () => {
    console.log("Mini App загружен. Предварительная загрузка данных...");
    fetchAndParseSheet().then((data) => {
        console.log(`Предзагрузка завершена. ${data?.length || 0} записей.`);
    }).catch(error => {
        // Ошибка уже обработана и показана в fetchAndParseSheet
        console.error("Ошибка предзагрузки (обработана ранее):", error);
    });
});

// Обработка смены темы Telegram
tg.onEvent('themeChanged', function() {
  console.log('Тема Telegram изменена:', tg.themeParams);
  document.body.style.backgroundColor = tg.themeParams.bg_color || '#ffffff';
  document.body.style.color = tg.themeParams.text_color || '#000000';
});
