const tg = window.Telegram.WebApp;

// Инициализация Web App
tg.ready();
// Расширяем приложение на всю высоту
tg.expand();

const citySelect = document.getElementById('city');
const rentInput = document.getElementById('rent');
const searchButton = document.getElementById('search-button');
const resultsContainer = document.getElementById('results');
const loadingMessage = document.getElementById('loading-message');
const noResultsMessage = document.getElementById('no-results-message');

let apartmentsData = []; // Хранение полученных данных
let currentSlide = 0;   // Индекс текущего слайда для карусели

// --- Функции для базовой карусели ---
function showSlide(index) {
    const slides = resultsContainer.querySelectorAll('.apartment-card');
    if (index >= slides.length || index < 0) return; // Границы

    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index); // Показываем только нужный слайд
    });
    currentSlide = index;
    updateCarouselButtons();
}

function updateCarouselButtons() {
    const controls = document.querySelector('.carousel-controls');
    if (!controls) return;
    const prevButton = controls.querySelector('.prev');
    const nextButton = controls.querySelector('.next');
    const slides = resultsContainer.querySelectorAll('.apartment-card');

    if (prevButton) prevButton.disabled = currentSlide === 0;
    if (nextButton) nextButton.disabled = currentSlide === slides.length - 1;
}

function createCarouselControls() {
     // Удаляем старые кнопки, если есть
    const existingControls = resultsContainer.querySelector('.carousel-controls');
    if (existingControls) {
        existingControls.remove();
    }

    const slides = resultsContainer.querySelectorAll('.apartment-card');
    if (slides.length > 1) { // Показываем кнопки только если больше 1 слайда
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
        resultsContainer.appendChild(controlsDiv); // Добавляем кнопки после карточек
        controlsDiv.style.display = 'block'; // Показываем контейнер кнопок
    }
}
// --- Конец функций карусели ---

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

    // Очистка предыдущих результатов и сообщений
    resultsContainer.innerHTML = '';
    loadingMessage.style.display = 'block';
    noResultsMessage.style.display = 'none';

    // Делаем кнопку неактивной на время запроса
    searchButton.disabled = true;
    searchButton.style.opacity = 0.7;
    searchButton.textContent = 'Идет поиск...';


    try {
        // Формируем URL с параметрами запроса
        const params = new URLSearchParams({ city: city, rent: rent });
        const response = await fetch(`/get_apartments?${params.toString()}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Ошибка сети или не JSON ответ' }));
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }

        apartmentsData = await response.json();

        loadingMessage.style.display = 'none';

        if (apartmentsData.length === 0) {
            noResultsMessage.style.display = 'block';
        } else {
            displayApartments(apartmentsData);
             // Настройка карусели после отображения
            createCarouselControls(); // Создаем кнопки
             if (apartmentsData.length > 0) {
                showSlide(0); // Показываем первый слайд
            }
        }

    } catch (error) {
        loadingMessage.style.display = 'none';
        noResultsMessage.textContent = `Произошла ошибка: ${error.message}`;
        noResultsMessage.style.display = 'block';
        console.error('Ошибка при получении данных:', error);
    } finally {
         // Возвращаем кнопку в активное состояние
        searchButton.disabled = false;
        searchButton.style.opacity = 1;
        searchButton.textContent = 'Продолжить'; // Или 'Искать снова'
    }
});

function displayApartments(apartments) {
    resultsContainer.innerHTML = ''; // Очищаем контейнер перед добавлением новых

    apartments.forEach((apt, index) => {
        const card = document.createElement('div');
        card.className = 'apartment-card';
        card.dataset.index = index; // Для карусели

        // Добавляем изображение, если есть ссылка
        if (apt['ссылка на изображение']) {
            const img = document.createElement('img');
            img.src = apt['ссылка на изображение'];
            // Обработка ошибки загрузки изображения
            img.onerror = () => { img.style.display = 'none'; }; // Скрыть, если не загрузилось
            card.appendChild(img);
        }

        // Добавляем название
        const title = document.createElement('h3');
        title.textContent = apt['название'] || 'Без названия'; // Используем 'Без названия', если поле пустое
        card.appendChild(title);

        // Добавляем ежемесячный платеж
        const payment = document.createElement('p');
        const paymentValue = apt['ежемесячный платеж'] ? `${Math.round(apt['ежемесячный платеж']).toLocaleString('ru-RU')} ₽/мес` : 'не указан';
        payment.innerHTML = `<strong>Ипотека:</strong> ${paymentValue}`;
        card.appendChild(payment);

        // Добавляем цену (если есть)
        if (apt['цена']) {
            const price = document.createElement('p');
            const priceValue = typeof apt['цена'] === 'number' ? `${Math.round(apt['цена']).toLocaleString('ru-RU')} ₽` : apt['цена'];
            price.textContent = `Цена: ${priceValue}`;
            card.appendChild(price);
        }

        resultsContainer.appendChild(card);
    });

    // Скрываем/показываем блок с кнопками навигации в зависимости от количества результатов
    const controls = document.querySelector('.carousel-controls');
    if(controls) {
        controls.style.display = apartments.length > 1 ? 'block' : 'none';
    }

}

// Можно добавить слушатель для изменения темы Telegram
tg.onEvent('themeChanged', function() {
  document.body.style.backgroundColor = tg.themeParams.bg_color;
  document.body.style.color = tg.themeParams.text_color;
  // Можно добавить обновление стилей для других элементов
});

// Показываем основную кнопку Telegram (если нужно)
// tg.MainButton.setText('Закрыть');
// tg.MainButton.show();
// tg.MainButton.onClick(() => tg.close());
