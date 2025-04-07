// --- Инициализация Telegram Web App ---
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
    { id: 'door_bath', question: 'Есть ли повреждения на двери в ванную?', instruction: 'См. инструкцию для межкомнатной двери.' },
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

// Словарь описаний дефектов для превью в Mini App
const DEFECT_DESCRIPTIONS_JS = {
    'door': "обнаружены повреждения/дефекты на межкомнатной двери",
    'window': "обнаружены повреждения/дефекты на окне(ах) или фурнитуре",
    'walls': "обнаружены дефекты на стенах (неровности, повреждения покрытия)",
    'ceiling': "обнаружены дефекты на потолке (трещины, пятна, неровности)",
    'floor': "обнаружены дефекты напольного покрытия или плинтусов",
    'electrics': "обнаружены проблемы с электрикой (розетки, выключатели, свет)",
    'radiator': "обнаружены повреждения/дефекты на радиаторе(ах) отопления",
    'door_bath': "обнаружены повреждения/дефекты на двери в ванную",
    'walls_floor_bath': "обнаружены дефекты плитки (стены/пол) или затирки швов",
    'ceiling_bath': "обнаружены дефекты на потолке в ванной",
    'plumbing': "обнаружены проблемы с сантехникой (протечки, работа смесителей/унитаза)",
    'ventilation_bath': "обнаружены проблемы с вентиляцией в ванной",
    'electrics_bath': "обнаружены проблемы с электрикой в ванной",
    'entry_door': "обнаружены повреждения/дефекты на входной двери или фурнитуре",
    'walls_corr': "обнаружены дефекты на стенах коридора",
    'ceiling_corr': "обнаружены дефекты на потолке коридора",
    'floor_corr': "обнаружены дефекты напольного покрытия или плинтусов в коридоре",
    'electrics_corr': "обнаружены проблемы с электрикой в коридоре (включая домофон)",
};


// --- Глобальные переменные состояния ---
let currentScreen = 'welcome-screen';
let numberOfRooms = 1;
let checklist = [];
let currentRoomIndex = -1;
let currentItemIndex = -1;
let defectsList = []; // Массив для записи дефектов { room: '...', item: '...', question: '...' }

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
        if (screens[key]) screens[key].classList.remove('active');
    }
    if (screens[screenId]) {
        screens[screenId].classList.add('active');
        currentScreen = screenId;
        window.scrollTo(0, 0);
    } else {
        console.error(`Экран с ID "${screenId}" не найден!`);
    }
}

/** Генерирует полный чек-лист на основе числа комнат */
function generateFullChecklist() {
    checklist = [];
    for (let i = 0; i < numberOfRooms; i++) {
        checklist.push({ name: `Комната ${i + 1}`, items: roomChecklistItems.map(item => ({ ...item })) });
    }
    checklist.push({ name: 'Ванная комната', items: bathroomChecklistItems.map(item => ({ ...item })) });
    checklist.push({ name: 'Коридор/Прихожая', items: corridorChecklistItems.map(item => ({ ...item })) });
    console.log("Сгенерированный чек-лист:", checklist);
}

/** Отображает текущий вопрос и инструкцию чек-листа */
function displayCurrentCheckItem() {
    if (currentRoomIndex < 0 || currentRoomIndex >= checklist.length) {
        console.error("Неверный индекс комнаты:", currentRoomIndex);
        showCompletionScreen();
        return;
    }
    const room = checklist[currentRoomIndex];
    if (currentItemIndex < 0 || currentItemIndex >= room.items.length) {
        console.error("Неверный индекс элемента:", currentItemIndex, "в комнате", room.name);
        currentItemIndex = 0;
        currentRoomIndex++;
        if (currentRoomIndex >= checklist.length) {
             showCompletionScreen();
        } else {
             displayCurrentCheckItem();
        }
        return;
    }
    const item = room.items[currentItemIndex];

    checklistTitle.textContent = `Проверка: ${room.name}`;
    itemQuestion.textContent = item.question;
    itemInstruction.textContent = item.instruction;

    // Обновление индикатора прогресса
    const totalItems = checklist.reduce((sum, r) => sum + r.items.length, 0);
    let completedItems = 0;
    for (let i = 0; i < currentRoomIndex; i++) {
        completedItems += checklist[i].items.length;
    }
    completedItems += currentItemIndex + 1;
    progressIndicator.textContent = `Шаг ${completedItems} из ${totalItems}`;

    if (currentScreen !== 'checklist') {
        showScreen('checklist');
    }
}

/** Переходит к следующему пункту чек-листа или к завершению */
function nextCheckItem() {
    if (!checklist[currentRoomIndex]) {
         console.error("Ошибка: Попытка перейти к следующему элементу в несуществующей комнате.");
         showCompletionScreen();
         return;
    }
    const currentRoom = checklist[currentRoomIndex];

    if (currentItemIndex < currentRoom.items.length - 1) {
        currentItemIndex++;
    } else {
        currentItemIndex = 0;
        currentRoomIndex++;
        if (currentRoomIndex >= checklist.length) {
            showCompletionScreen();
            return;
        }
    }
    displayCurrentCheckItem();
}

/** Записывает обнаруженный дефект в массив defectsList */
function recordDefect() {
    if (!checklist[currentRoomIndex] || !checklist[currentRoomIndex].items[currentItemIndex]) {
         console.error("Ошибка записи дефекта: Неверный индекс комнаты или элемента.");
         return;
    }
    const room = checklist[currentRoomIndex];
    const item = room.items[currentItemIndex];
    const defect = {
        room: room.name,
        item: item.id,
        question: item.question
    };
    defectsList.push(defect);
    console.log("Записан дефект:", defect);
}

/** Показывает экран завершения и превью списка дефектов */
function showCompletionScreen() {
     summaryList.innerHTML = '';
     if (defectsList.length > 0) {
          noDefectsMessage.style.display = 'none';
          summaryList.style.display = 'block';
          defectsList.forEach(defect => {
               const li = document.createElement('li');
               const itemId = defect.item || 'unknown';
               const description = DEFECT_DESCRIPTIONS_JS[itemId] || `обнаружен дефект (${itemId})`;
               li.textContent = `${defect.room}: ${description}`; // Используем корректное описание
               summaryList.appendChild(li);
          });
     } else {
          noDefectsMessage.style.display = 'block';
          summaryList.style.display = 'none';
     }
     showScreen('completion');
}


// --- Функция submitResults() больше не нужна и удалена ---
/*
function submitResults() {
    // ... старый код с tg.sendData() ...
}
*/

// --- Инициализация и обработчики событий ---

document.addEventListener('DOMContentLoaded', () => {
    // Инициализация Telegram Web App API
    try {
         if (window.Telegram && window.Telegram.WebApp) {
              tg.ready();
              tg.expand(); // Раскрываем на весь экран
              console.log("Telegram WebApp API инициализировано.");

              // Обработка смены темы
              tg.onEvent('themeChanged', function() {
                 console.log('Тема Telegram изменена:', tg.themeParams);
                 document.body.style.backgroundColor = tg.themeParams.bg_color || '#ffffff';
                 document.body.style.color = tg.themeParams.text_color || '#000000';
              });
              // Применяем тему сразу
               document.body.style.backgroundColor = tg.themeParams.bg_color || '#ffffff';
               document.body.style.color = tg.themeParams.text_color || '#000000';

         } else {
              console.warn("Telegram WebApp API не найдено. Возможно, страница открыта не в Telegram.");
         }
    } catch (e) {
        console.error("Ошибка при инициализации Telegram WebApp API:", e);
    }


    // Назначение обработчиков на кнопки
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
            currentRoomIndex = 0;
            currentItemIndex = 0;
            defectsList = []; // Очищаем список перед стартом
            displayCurrentCheckItem();
        });
    }

    if (okButton) {
        okButton.addEventListener('click', () => {
            nextCheckItem();
        });
    }

    if (defectButton) {
        defectButton.addEventListener('click', () => {
            recordDefect();
            nextCheckItem();
        });
    }

    if (finishButton) {
        // --- ИЗМЕНЕНИЕ: Обработчик кнопки "Завершить..." ---
        finishButton.addEventListener('click', () => {
            console.log('Нажата кнопка "Завершить и получить список". Показываем финальный экран.');
            showCompletionScreen(); // Убедимся, что превью дефектов отображено

            // Находим родительский div экрана завершения
            const completionDiv = document.getElementById('completion-screen');
            // Ищем, не добавили ли мы уже инструкцию
            let existingInstruction = completionDiv.querySelector('.post-completion-instruction');

            // Добавляем инструкцию, если её ещё нет
            if (!existingInstruction) {
                 const instructionP = document.createElement('p');
                 instructionP.className = 'post-completion-instruction'; // Добавляем класс для возможных стилей
                 instructionP.style.marginTop = '20px';
                 instructionP.style.padding = '10px';
                 instructionP.style.background = '#fffbe6'; // Легкий желтый фон для выделения
                 instructionP.style.border = '1px solid #ffe58f';
                 instructionP.style.borderRadius = '5px';
                 instructionP.style.textAlign = 'center';
                 instructionP.textContent = 'Проверка завершена! Теперь вернитесь в чат с ботом и нажмите там кнопку "Я завершил(а) приемку", чтобы получить финальное сообщение.';
                 // Вставляем после кнопки "Завершить..."
                 finishButton.parentNode.insertBefore(instructionP, finishButton.nextSibling);
            }

            // Можно деактивировать кнопку после первого нажатия, чтобы избежать повторов
            finishButton.disabled = true;
            finishButton.textContent = 'Завершено';
            finishButton.style.opacity = '0.7'; // Визуально показываем неактивность

            // НЕ ВЫЗЫВАЕМ submitResults() и tg.close()
            // Окно закроет сам пользователь
        });
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---
    }

    // Показываем начальный экран при загрузке
    showScreen('welcome');
});

// --- Конец скрипта ---
