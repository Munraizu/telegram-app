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
    { id: 'door', question: 'Есть ли повреждения на двери в ванную?', instruction: 'См. инструкцию для межкомнатной двери.' },
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
let currentRoomIndex = -1; // Начинаем до комнат
let currentItemIndex = -1; // Начинаем до элементов
let defectsList = []; // Массив для записи дефектов

// --- Получение ссылок на элементы DOM ---
const screens = {
    welcome: document.getElementById('welcome-screen'),
    roomCount: document.getElementById('room-count-screen'),
    checklist: document.getElementById('checklist-screen'),
    completion: document.getElementById('completion-screen')
};
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
const summaryList = document.getElementById('summary-list');
const noDefectsMessage = document.getElementById('no-defects-message');


// --- Функции ---

/** Показывает экран по ID, скрывая остальные */
function showScreen(screenId) {
    for (const key in screens) {
        screens[key].classList.remove('active');
    }
    screens[screenId].classList.add('active');
    currentScreen = screenId;
    window.scrollTo(0, 0); // Прокрутка вверх при смене экрана
}

/** Генерирует полный чек-лист на основе числа комнат */
function generateFullChecklist() {
    checklist = [];
    for (let i = 0; i < numberOfRooms; i++) {
        checklist.push({ name: `Комната ${i + 1}`, items: [...roomChecklistItems] });
    }
    checklist.push({ name: 'Ванная комната', items: [...bathroomChecklistItems] });
    checklist.push({ name: 'Коридор/Прихожая', items: [...corridorChecklistItems] });
    console.log("Сгенерированный чек-лист:", checklist);
}

/** Отображает текущий вопрос и инструкцию чек-листа */
function displayCurrentCheckItem() {
    if (currentRoomIndex < 0 || currentRoomIndex >= checklist.length) {
        console.error("Неверный индекс комнаты");
        return; // Или перейти к завершению
    }
    const room = checklist[currentRoomIndex];
    if (currentItemIndex < 0 || currentItemIndex >= room.items.length) {
        console.error("Неверный индекс элемента");
        return; // Или перейти к следующей комнате
    }
    const item = room.items[currentItemIndex];

    checklistTitle.textContent = `Проверка: ${room.name}`;
    itemQuestion.textContent = item.question;
    itemInstruction.textContent = item.instruction;

    // Обновляем индикатор прогресса
    const totalItems = checklist.reduce((sum, r) => sum + r.items.length, 0);
    let completedItems = 0;
    for(let i = 0; i < currentRoomIndex; i++){
         completedItems += checklist[i].items.length;
    }
    completedItems += currentItemIndex + 1;
     progressIndicator.textContent = `Шаг ${completedItems} из ${totalItems}`;

    showScreen('checklist');
}

/** Переходит к следующему пункту чек-листа или к завершению */
function nextCheckItem() {
    const currentRoom = checklist[currentRoomIndex];
    if (currentItemIndex < currentRoom.items.length - 1) {
        // Переход к следующему элементу в текущей комнате
        currentItemIndex++;
    } else {
        // Переход к следующей комнате
        currentItemIndex = 0;
        currentRoomIndex++;
        // Проверка, есть ли еще комнаты
        if (currentRoomIndex >= checklist.length) {
            // Все проверки завершены
            showCompletionScreen();
            return; // Выход из функции
        }
    }
    // Отображаем следующий элемент
    displayCurrentCheckItem();
}

/** Записывает обнаруженный дефект */
function recordDefect() {
    const room = checklist[currentRoomIndex];
    const item = room.items[currentItemIndex];
    const defect = {
        room: room.name,
        item: item.id, // Используем id для краткости
        question: item.question // Сохраняем вопрос для понятности отчета
        // Можно добавить поле для комментария пользователя, если реализовать ввод
        // comment: prompt("Опишите дефект (необязательно):") || "Обнаружен дефект"
    };
    defectsList.push(defect);
    console.log("Записан дефект:", defect);
    console.log("Текущий список дефектов:", defectsList);
}

/** Показывает экран завершения и превью дефектов */
function showCompletionScreen() {
     summaryList.innerHTML = ''; // Очищаем старый список
     if (defectsList.length > 0) {
          noDefectsMessage.style.display = 'none';
          summaryList.style.display = 'block';
          defectsList.forEach(defect => {
               const li = document.createElement('li');
               li.textContent = `${defect.room} - ${defect.question}`; // Показываем понятное описание
               summaryList.appendChild(li);
          });
     } else {
          noDefectsMessage.style.display = 'block';
          summaryList.style.display = 'none';
     }
     showScreen('completion');
}


/** Отправляет список дефектов боту */
function submitResults() {
    console.log("Отправка результатов боту...");
    const dataToSend = {
        action: 'submit_acceptance', // Уникальный идентификатор для этого приложения
        defects: defectsList
    };
    try {
        tg.sendData(JSON.stringify(dataToSend));
        // Mini App обычно закрывается после sendData
    } catch (error) {
        console.error("Ошибка при вызове tg.sendData:", error);
        alert("Не удалось отправить результаты. Возможно, вы используете приложение не через Telegram?");
    }
}


// --- Инициализация и обработчики событий ---

// Кнопка "Поехали!" на стартовом экране
startButton.addEventListener('click', () => {
    showScreen('roomCount');
});

// Кнопка "Далее" после ввода числа комнат
confirmRoomsButton.addEventListener('click', () => {
    numberOfRooms = parseInt(roomCountInput.value) || 0;
    if (numberOfRooms < 0) numberOfRooms = 0; // Не позволяем отрицательное число
    generateFullChecklist();
    // Начинаем проверку с первой комнаты (индекс 0) и первого элемента (индекс 0)
    currentRoomIndex = 0;
    currentItemIndex = 0;
    defectsList = []; // Очищаем список дефектов перед новым прогоном
    displayCurrentCheckItem();
});

// Кнопка "Всё норм" в чек-листе
okButton.addEventListener('click', () => {
    // Просто переходим к следующему пункту
    nextCheckItem();
});

// Кнопка "Косяк!" в чек-листе
defectButton.addEventListener('click', () => {
    recordDefect(); // Записываем дефект
    nextCheckItem(); // Переходим к следующему пункту
});

// Кнопка "Завершить и получить список" на экране завершения
finishButton.addEventListener('click', () => {
    submitResults();
});

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    tg.ready(); // Сообщаем Telegram, что Mini App готово
    showScreen('welcome'); // Показываем первый экран
});

// Обработка изменения темы Telegram (опционально)
tg.onEvent('themeChanged', function() {
  console.log('Тема Telegram изменена:', tg.themeParams);
  document.body.style.backgroundColor = tg.themeParams.bg_color || '#ffffff';
  document.body.style.color = tg.themeParams.text_color || '#000000';
});
