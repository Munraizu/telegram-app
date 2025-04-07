const tg = window.Telegram.WebApp;

// --- Структура чек-листа ---
// Элементы для проверки в стандартной комнате
const roomChecklistItems = [
    { id: 'door', question: 'Есть ли повреждения на межкомнатной двери?', instruction: 'Внимательно осмотрите дверное полотно с обеих сторон и с торца. На двери не должно быть сколов, царапин, трещин, вздутий и других изъянов. Проверьте работу ручки и замка.' },
    { id: 'window', question: 'Есть ли повреждения на окне(ах)?', instruction: 'Осмотрите раму и стеклопакет на наличие царапин, трещин, сколов. Проверьте плотность прилегания створок, легкость открытия/закрытия, работу фурнитуры. Убедитесь в наличии уплотнителей.' },
    { id: 'walls', question: 'Есть ли дефекты на стенах?', instruction: 'Проверьте ровность стен (визуально или правилом). Осмотрите обои/покраску на наличие пятен, царапин, вздутий, неровностей, расхождения швов (для обоев).' },
    { id: 'ceiling', question: 'Есть ли дефекты на потолке?', instruction: 'Осмотрите потолок на наличие трещин, пятен, неровностей, разводов. Проверьте качество стыков плит (если применимо).' },
    { id: 'floor', question: 'Есть ли дефекты напольного покрытия?', instruction: 'Проверьте пол на наличие царапин, сколов, вздутий, неровностей. Обратите внимание на стыки (для ламината, паркета). Проверьте качество установки плинтусов, их прилегание к стене и полу.' },
    { id: 'electrics', question: 'Работает ли электрика?', instruction: 'Проверьте работу всех розеток (тестером или зарядкой), выключателей и осветительных приборов (если установлены).' },
    { id: 'radiator', question: 'Есть ли повреждения на радиаторе(ах) отопления?', instruction: 'Осмотрите радиатор на наличие царапин, вмятин, подтеков. Проверьте надежность крепления.' }
];

// Элементы для проверки в ванной
const bathroomChecklistItems = [
    { id: 'door_bath', question: 'Есть ли повреждения на двери в ванную?', instruction: 'См. инструкцию для межкомнатной двери.' }, // Используем _bath для уникальности id
    { id: 'walls_floor_bath', question: 'Есть ли дефекты плитки (стены/пол)?', instruction: 'Проверьте плитку на сколы, трещины, пустоты под плиткой (простукиванием). Оцените качество затирки швов.' },
    { id: 'ceiling_bath', question: 'Есть ли дефекты на потолке?', instruction: 'См. инструкцию для потолка в комнате.' },
    { id: 'plumbing', question: 'Работает ли сантехника? Есть ли подтеки?', instruction: 'Проверьте работу смесителей, душа, унитаза (слив/набор воды). Осмотрите все соединения на предмет подтеков. Проверьте наличие и работу полотенцесушителя.' },
    { id: 'ventilation_bath', question: 'Работает ли вентиляция?', instruction: 'Поднесите лист бумаги к вентиляционной решетке – он должен притянуться.' },
    { id: 'electrics_bath', question: 'Работает ли электрика в ванной?', instruction: 'Проверьте розетки (если есть, должны быть влагозащищенные), выключатели, освещение.' }
];

// Элементы для проверки в коридоре
const corridorChecklistItems = [
    { id: 'entry_door', question: 'Есть ли повреждения на входной двери?', instruction: 'Осмотрите дверь с обеих сторон и с торца на сколы, царапины. Проверьте работу замков, ручки, глазка, уплотнителей по периметру.' },
    { id: 'walls_corr', question: 'Есть ли дефекты на стенах коридора?', instruction: 'См. инструкцию для стен в комнате.' },
    { id: 'ceiling_corr', question: 'Есть ли дефекты на потолке коридора?', instruction: 'См. инструкцию для потолка в комнате.' },
    { id: 'floor_corr', question: 'Есть ли дефекты напольного покрытия в коридоре?', instruction: 'См. инструкцию для пола в комнате.' },
    { id: 'electrics_corr', question: 'Работает ли электрика в коридоре?', instruction: 'Проверьте розетки, выключатели, освещение, работу домофона (если есть).' }
];

// --- Глобальные переменные состояния ---
let currentScreen = 'welcome-screen';
let numberOfRooms = 1;
let checklist = []; // Полная структура чек-листа для этой квартиры
let currentRoomIndex = -1; // Индекс текущей комнаты в `checklist`
let currentItemIndex = -1; // Индекс текущего элемента в `checklist[currentRoomIndex].items`
let defectsList = []; // Массив для записи дефектов { room: '...', item: '...', question: '...' }

// --- Получение ссылок на элементы DOM ---
// Экраны
const screens = {
    welcome: document.getElementById('welcome-screen'),
    roomCount: document.getElementById('room-count-screen'),
    checklist: document.getElementById('checklist-screen'),
    completion: document.getElementById('completion-screen')
};
// Кнопки и элементы управления
const startButton = document.getElementById('start-button');
const roomCountInput = document.getElementById('room-count-input');
const confirmRoomsButton = document.getElementById('confirm-rooms-button');
const checklistTitle = document.getElementById('checklist-title');
const itemQuestion = document.getElementById('item-question');
const itemInstruction = document.getElementById('item-instruction');
const okButton = document.getElementById('ok-button');
const defectButton = document.getElementById('defect-button');
const finishButton = document.getElementById('finish-button');
const progressIndicator = document.getElementById('progress-indicator');
// Элементы экрана завершения
const summaryList = document.getElementById('summary-list');
const noDefectsMessage = document.getElementById('no-defects-message');


// --- Функции ---

/** Показывает экран по ID, скрывая остальные */
function showScreen(screenId) {
    for (const key in screens) {
        if (screens[key]) { // Проверка на случай ошибки получения элемента
             screens[key].classList.remove('active');
        }
    }
    if (screens[screenId]) {
        screens[screenId].classList.add('active');
        currentScreen = screenId;
        window.scrollTo(0, 0); // Прокрутка вверх
    } else {
        console.error(`Экран с ID "${screenId}" не найден!`);
    }
}

/** Генерирует полный чек-лист на основе числа комнат */
function generateFullChecklist() {
    checklist = [];
    // Добавляем жилые комнаты
    for (let i = 0; i < numberOfRooms; i++) {
        // Клонируем массив объектов, чтобы избежать ссылочной зависимости
        const roomItems = roomChecklistItems.map(item => ({ ...item }));
        checklist.push({ name: `Комната ${i + 1}`, items: roomItems });
    }
    // Добавляем ванную и коридор (также клонируем)
    checklist.push({ name: 'Ванная комната', items: bathroomChecklistItems.map(item => ({ ...item })) });
    checklist.push({ name: 'Коридор/Прихожая', items: corridorChecklistItems.map(item => ({ ...item })) });
    console.log("Сгенерированный чек-лист:", checklist);
}

/** Отображает текущий вопрос и инструкцию чек-листа */
function displayCurrentCheckItem() {
    // Проверка валидности индексов
    if (currentRoomIndex < 0 || currentRoomIndex >= checklist.length) {
        console.error("Неверный индекс комнаты:", currentRoomIndex);
        showCompletionScreen(); // Переходим к завершению при ошибке индекса
        return;
    }
    const room = checklist[currentRoomIndex];
    if (currentItemIndex < 0 || currentItemIndex >= room.items.length) {
        console.error("Неверный индекс элемента:", currentItemIndex, "в комнате", room.name);
        // Пытаемся перейти к следующей комнате или завершить
        currentItemIndex = 0;
        currentRoomIndex++;
        if (currentRoomIndex >= checklist.length) {
             showCompletionScreen();
        } else {
             displayCurrentCheckItem(); // Показываем первый элемент следующей комнаты
        }
        return;
    }
    const item = room.items[currentItemIndex];

    // Обновление UI
    checklistTitle.textContent = `Проверка: ${room.name}`;
    itemQuestion.textContent = item.question;
    itemInstruction.textContent = item.instruction;

    // Обновление индикатора прогресса
    const totalItems = checklist.reduce((sum, r) => sum + r.items.length, 0);
    let completedItems = 0;
    for (let i = 0; i < currentRoomIndex; i++) {
        completedItems += checklist[i].items.length;
    }
    completedItems += currentItemIndex + 1; // +1 так как индексы с нуля
    progressIndicator.textContent = `Шаг ${completedItems} из ${totalItems}`;

    // Убедимся, что показан экран чек-листа
    if (currentScreen !== 'checklist') {
        showScreen('checklist');
    }
}

/** Переходит к следующему пункту чек-листа или к завершению */
function nextCheckItem() {
    // Проверяем, есть ли текущая комната в сгенерированном списке
    if (!checklist[currentRoomIndex]) {
         console.error("Ошибка: Попытка перейти к следующему элементу в несуществующей комнате.");
         showCompletionScreen(); // Переходим к завершению
         return;
    }
    const currentRoom = checklist[currentRoomIndex];

    if (currentItemIndex < currentRoom.items.length - 1) {
        // Есть еще элементы в этой комнате
        currentItemIndex++;
    } else {
        // Элементы в этой комнате закончились, переходим к следующей комнате
        currentItemIndex = 0; // Сбрасываем индекс элемента
        currentRoomIndex++;   // Увеличиваем индекс комнаты

        // Проверяем, закончились ли комнаты
        if (currentRoomIndex >= checklist.length) {
            showCompletionScreen(); // Все проверки завершены
            return; // Важно выйти, чтобы не вызвать displayCurrentCheckItem ниже
        }
    }
    // Отображаем следующий пункт
    displayCurrentCheckItem();
}

/** Записывает обнаруженный дефект в массив defectsList */
function recordDefect() {
    // Проверяем валидность индексов перед записью
    if (!checklist[currentRoomIndex] || !checklist[currentRoomIndex].items[currentItemIndex]) {
         console.error("Ошибка записи дефекта: Неверный индекс комнаты или элемента.");
         return;
    }
    const room = checklist[currentRoomIndex];
    const item = room.items[currentItemIndex];
    const defect = {
        room: room.name,
        item: item.id, // Используем id для краткости
        question: item.question // Сохраняем вопрос для понятности отчета
    };
    defectsList.push(defect);
    console.log("Записан дефект:", defect);
}

/** Показывает экран завершения и превью списка дефектов */
function showCompletionScreen() {
     // Очищаем предыдущий список в превью
     summaryList.innerHTML = '';
     if (defectsList.length > 0) {
          // Показываем список дефектов
          noDefectsMessage.style.display = 'none';
          summaryList.style.display = 'block'; // Убедимся, что список виден
          defectsList.forEach(defect => {
               const li = document.createElement('li');
               // Отображаем Room - Question для лучшей читаемости
               li.textContent = `${defect.room} - ${defect.question}`;
               summaryList.appendChild(li);
          });
     } else {
          // Показываем сообщение об отсутствии дефектов
          noDefectsMessage.style.display = 'block';
          summaryList.style.display = 'none'; // Скрываем пустой ul
     }
     // Показываем экран завершения
     showScreen('completion');
}


/** Отправляет список дефектов боту и пытается закрыть Mini App */
function submitResults() {
    console.log("Отправка результатов боту...");
    const dataToSend = {
        action: 'submit_acceptance', // Идентификатор для бота
        defects: defectsList // Массив собранных дефектов
    };
    try {
        // Отправляем данные боту в виде JSON-строки
        tg.sendData(JSON.stringify(dataToSend));
        // sendData ДОЛЖНА автоматически закрывать Mini App.
        // Добавляем явный вызов close() на случай, если в какой-то среде это не сработает.
        console.log("sendData вызвана. Попытка явного закрытия tg.close()...");
        tg.close(); // Явный вызов закрытия
    } catch (error) {
        console.error("Ошибка при вызове tg.sendData или tg.close:", error);
        // Показываем alert только если ошибка не связана с методом close,
        // т.к. ошибка close после успешной sendData может быть нормальной в некоторых клиентах.
        if (!error.message || !error.message.toLowerCase().includes("close")) {
             alert("Не удалось отправить результаты. Возможно, вы используете приложение не через Telegram?");
        }
    }
}


// --- Инициализация и обработчики событий ---

// Убедимся, что все элементы существуют перед добавлением слушателей
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем наличие всех ключевых элементов
    if (!tg) {
         console.error("Объект Telegram WebApp (tg) не найден!");
         // Можно показать сообщение об ошибке пользователю
         // document.body.innerHTML = '<p style="color: red; padding: 20px;">Ошибка: Не удалось инициализировать приложение Telegram.</p>';
         // return;
    } else {
        tg.ready(); // Сообщаем Telegram, что Mini App готово
    }

    if (startButton) {
        startButton.addEventListener('click', () => {
            showScreen('roomCount');
        });
    }

    if (confirmRoomsButton) {
        confirmRoomsButton.addEventListener('click', () => {
            numberOfRooms = parseInt(roomCountInput.value) || 0;
            if (numberOfRooms < 0) numberOfRooms = 0;
            generateFullChecklist();
            // Начинаем проверку
            currentRoomIndex = 0;
            currentItemIndex = 0;
            defectsList = []; // Очищаем старые дефекты
            displayCurrentCheckItem(); // Показываем первый пункт
        });
    }

    if (okButton) {
        okButton.addEventListener('click', () => {
            nextCheckItem(); // Просто переходим дальше
        });
    }

    if (defectButton) {
        defectButton.addEventListener('click', () => {
            recordDefect(); // Записываем дефект
            nextCheckItem(); // Переходим дальше
        });
    }

    if (finishButton) {
        finishButton.addEventListener('click', () => {
            submitResults(); // Отправляем результаты
        });
    }

    // Показываем начальный экран
    showScreen('welcome');
});

// Обработка изменения темы Telegram
if (tg) {
    tg.onEvent('themeChanged', function() {
      console.log('Тема Telegram изменена:', tg.themeParams);
      // Применяем стили темы к body
      document.body.style.backgroundColor = tg.themeParams.bg_color || '#ffffff';
      document.body.style.color = tg.themeParams.text_color || '#000000';
    });
}
