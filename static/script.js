const tg = window.Telegram.WebApp;

// URL вашей опубликованной Google Таблицы в формате TSV
const GOOGLE_SHEET_TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRzFm-I4hL8tKOSXOsW-yeg4N2-WJfA9aLBXfxf4pF6pvGQFPbnj1fTztVWTQVkS9q-seBCXLMx07Z9/pub?output=tsv';

// Предполагаемые имена столбцов (как в вашей таблице) - ВАЖНО: проверьте их!
const COLUMNS = {
    PAYMENT: 'Ежемесячный платеж',
    IMAGE_URL: 'Ссылка на изображение',
    TITLE: 'Название',
    PRICE: 'Цена',
    CITY: 'Город'
};

// Инициализация Web App
tg.ready();
tg.expand(); // Расширяем приложение

// --- Получаем элементы DOM ---
const citySelect = document.getElementById('city'); // Убедитесь, что ID совпадает в HTML
const rentInput = document.getElementById('rent'); // Убедитесь, что ID совпадает в HTML
const searchButton = document.getElementById('search-button'); // Убедитесь, что ID совпадает в HTML
const resultsContainer = document.getElementById('results'); // Убедитесь, что ID совпадает в HTML
const loadingMessage = document.getElementById('loading-message'); // Убедитесь, что ID совпадает в HTML
const noResultsMessage = document.getElementById('no-results-message'); // Убедитесь, что ID совпадает в HTML

let apartmentsData = []; // Массив для хранения данных из таблицы
let currentSlide = 0;   // Индекс текущего слайда для карусели

// --- Функции для базовой карусели (оставляем как были) ---
function showSlide(index) {
    const slides = resultsContainer.querySelectorAll('.apartment-card');
    if (!slides || slides.length === 0 || index >= slides.length || index < 0) return;

    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });
    currentSlide = index;
    updateCarouselButtons();
}

function updateCarouselButtons() {
    const controls = resultsContainer.querySelector('.carousel-controls'); // Ищем внутри resultsContainer
    if (!controls) return;
    const prevButton = controls.querySelector('.prev');
    const nextButton = controls.querySelector('.next');
    const slides = resultsContainer.querySelectorAll('.apartment-card');

    if (prevButton) prevButton.disabled = currentSlide === 0;
    if (nextButton) nextButton.disabled = currentSlide === slides.length - 1;
}

function createCarouselControls() {
    const existingControls = resultsContainer.querySelector('.carousel-controls');
    if (existingControls) {
        existingControls.remove();
    }

    const slides = resultsContainer.querySelectorAll('.apartment-card');
    if (slides.length > 1) {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'carousel-controls';

        const prevButton = document.createElement('button');
        prevButton.textContent = '⬅️ Назад';
        prevButton.className = 'prev';
        prevButton.onclick = () => showSlide(currentSlide - 1);

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Вперед ➡️';
        nextButton.className = 'next';
        nextButton.onclick = () => showSlide(currentSlide + 1);

        controlsDiv.appendChild(prevButton);
        controlsDiv.appendChild(nextButton);
        // Добавляем после всех карточек, но внутри resultsContainer
        resultsContainer.appendChild(controlsDiv);
        controlsDiv.style.display = 'block';
    } else {
         // Если слайд один или ноль, убедимся что кнопок нет
         const existingControls = resultsContainer.querySelector('.carousel-controls');
         if (existingControls) existingControls.style.display = 'none';
    }
}
// --- Конец функций карусели ---

// --- Функция загрузки и парсинга TSV ---
async function fetchAndParseSheet() {
    console.log("Загрузка данных из Google Sheet...");
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
            return []; // Нет данных для обработки
        }

        const headers = lines[0].split('\t').map(h => h.trim());
        console.log("Заголовки:", headers);

        // Находим индексы нужных столбцов
        const colIndices = {};
        for (const key in COLUMNS) {
            const index = headers.indexOf(COLUMNS[key]);
            if (index === -1) {
                 console.error(`Ошибка: Столбец "${COLUMNS[key]}" не найден в таблице!`);
                 // Можно выбросить ошибку или продолжить с предупреждением
                 // throw new Error(`Столбец "${COLUMNS[key]}" не найден.`);
                 alert(`Ошибка конфигурации: столбец "${COLUMNS[key]}" не найден в Google Таблице. Проверьте заголовки.`);
                 return []; // Прерываем парсинг
            }
            colIndices[key] = index;
        }


        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split('\t').map(v => v.trim());
            const row = {};

            try {
                 // Извлекаем и преобразуем данные
                 row.payment = parseFloat(values[colIndices.PAYMENT]?.replace(',', '.') || '0'); // Преобразуем в число, заменяем запятую на точку
                 row.imageUrl = values[colIndices.IMAGE_URL] || '';
                 row.title = values[colIndices.TITLE] || 'Нет названия';
                 // Цена может быть текстом или числом, пробуем преобразовать
                 const priceStr = values[colIndices.PRICE] || '';
                 row.price = isNaN(parseFloat(priceStr.replace(',', '.'))) ? priceStr : parseFloat(priceStr.replace(',', '.'));
                 row.city = values[colIndices.CITY] || '';

                 // Проверяем, что платеж - это число
                 if (isNaN(row.payment)) {
                     console.warn(`Не удалось преобразовать платеж в число в строке ${i + 1}:`, values[colIndices.PAYMENT]);
                     // Пропускаем эту строку или устанавливаем платеж в 0/Infinity
                     continue; // Пропустить эту квартиру
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
        return data;

    } catch (error) {
        console.error('Ошибка при загрузке или парсинге данных:', error);
        alert(`Не удалось загрузить данные из таблицы: ${error.message}`);
        return []; // Возвращаем пустой массив в случае ошибки
    }
}

// --- Функция фильтрации данных (на клиенте) ---
function filterApartments(city, maxRent) {
    console.log(`Фильтрация: Город="${city}", макс. аренда=${maxRent}`);
    if (!apartmentsData || apartmentsData.length === 0) {
        console.log("Нет данных для фильтрации.");
        return [];
    }

    const rent = parseFloat(maxRent);
    if (isNaN(rent)) {
        console.error("Некорректное значение максимальной аренды для фильтрации.");
        return [];
    }

    const filtered = apartmentsData.filter(apt => {
        // Сравнение города без учета регистра и возможных пробелов
        const cityMatch = apt.city.trim().toLowerCase() === city.trim().toLowerCase();
        // Платеж должен быть меньше или равен аренде
        const paymentMatch = apt.payment <= rent;
        // console.log(`Сравнение: ${apt.title} (${apt.city}) | ${apt.payment} <= ${rent}? | Город совпадает: ${cityMatch}, Платеж подходит: ${paymentMatch}`);
        return cityMatch && paymentMatch;
    });
    console.log(`Найдено ${filtered.length} подходящих квартир.`);
    return filtered;
}


// --- Функция отображения квартир ---
function displayApartments(apartments) {
    resultsContainer.innerHTML = ''; // Очищаем старые результаты

    if (apartments.length === 0) {
        noResultsMessage.style.display = 'block';
        loadingMessage.style.display = 'none';
        // Убедимся что кнопки карусели скрыты
         const controls = resultsContainer.querySelector('.carousel-controls');
         if(controls) controls.style.display = 'none';
        return;
    }

    noResultsMessage.style.display = 'none';
    loadingMessage.style.display = 'none';

    apartments.forEach((apt, index) => {
        const card = document.createElement('div');
        card.className = 'apartment-card'; // Будет скрыт CSS по умолчанию
        card.dataset.index = index;

        if (apt.imageUrl) {
            const img = document.createElement('img');
            img.src = apt.imageUrl;
            img.alt = apt.title;
            img.onerror = () => { img.style.display = 'none'; };
            card.appendChild(img);
        }

        const title = document.createElement('h3');
        title.textContent = apt.title;
        card.appendChild(title);

        const payment = document.createElement('p');
        const paymentValue = apt.payment ? `${Math.round(apt.payment).toLocaleString('ru-RU')} ₽/мес` : 'не указан';
        payment.innerHTML = `<strong>Ипотека:</strong> ${paymentValue}`;
        card.appendChild(payment);

        if (apt.price) {
            const price = document.createElement('p');
             // Отображаем как есть, если это не число, иначе форматируем
             const priceValue = typeof apt.price === 'number' ? `${Math.round(apt.price).toLocaleString('ru-RU')} ₽` : apt.price;
            price.textContent = `Цена: ${priceValue}`;
            card.appendChild(price);
        }
         // Добавляем город для отладки
         const cityP = document.createElement('p');
         cityP.textContent = `Город: ${apt.city}`;
         cityP.style.fontSize = '0.8em';
         cityP.style.color = '#888';
         card.appendChild(cityP);


        resultsContainer.appendChild(card);
    });

    // Настройка карусели после добавления всех карточек
    createCarouselControls();
     if (apartments.length > 0) {
        showSlide(0); // Показываем первый слайд
    }

}


// --- Основная логика при клике на кнопку ---
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

    // Загружаем данные (если еще не загружены)
    // Можно добавить логику кеширования, чтобы не грузить каждый раз
    if (apartmentsData.length === 0) {
        await fetchAndParseSheet();
         // Если после загрузки данных все еще нет, показываем сообщение
         if(apartmentsData.length === 0) {
             loadingMessage.style.display = 'none';
             noResultsMessage.textContent = 'Не удалось загрузить данные из таблицы или таблица пуста.'
             noResultsMessage.style.display = 'block';
             searchButton.disabled = false;
             searchButton.textContent = 'Продолжить';
             return; // Выход, если данных нет
         }
    }


    // Фильтруем загруженные данные
    const filteredResults = filterApartments(city, rent);

    // Отображаем результаты
    loadingMessage.style.display = 'none'; // Скрываем загрузку перед отображением
    displayApartments(filteredResults);

    // Возвращаем кнопку
    searchButton.disabled = false;
    searchButton.textContent = 'Продолжить'; // Или 'Искать снова'
});

// --- Загрузка данных при старте приложения ---
// Можно загружать данные сразу при открытии Mini App,
// чтобы поиск был быстрее при первом нажатии кнопки.
document.addEventListener('DOMContentLoaded', () => {
    console.log("Mini App загружен. Предварительная загрузка данных...");
    // Не блокируем интерфейс, просто запускаем загрузку в фоне
    fetchAndParseSheet().then(() => {
         console.log("Предварительная загрузка данных завершена.");
         // Можно здесь уже показать какие-то элементы интерфейса, если нужно
    }).catch(error => {
         console.error("Ошибка при предварительной загрузке:", error);
         // Можно показать сообщение об ошибке пользователю
    });
});

// Слушатель изменения темы Telegram (опционально)
tg.onEvent('themeChanged', function() {
  document.body.style.backgroundColor = tg.themeParams.bg_color;
  document.body.style.color = tg.themeParams.text_color;
  // Обновите стили других элементов при необходимости
});
