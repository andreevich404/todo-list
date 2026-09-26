(function () {
  'use strict';

  var TASKS_KEY = 'todo.tasks';
  var THEME_KEY = 'theme';
  var SEARCH_ANNOUNCE_DELAY = 700;

  var addButton = document.querySelector('[data-add-task]');
  var searchInput = document.querySelector('[data-search]');
  var listEl = document.querySelector('[data-task-list]');
  var emptyEl = document.querySelector('[data-empty]');
  var emptyTitleEl = document.querySelector('[data-empty-title]');
  var emptyTextEl = document.querySelector('[data-empty-text]');
  var liveEl = document.querySelector('[data-live]');
  var dialog = document.querySelector('[data-task-dialog]');
  var form = document.querySelector('[data-task-form]');
  var titleInput = document.querySelector('[data-title-input]');
  var titleError = document.querySelector('[data-title-error]');
  var dialogTitle = document.querySelector('[data-dialog-title]');
  var cancelButton = document.querySelector('[data-cancel]');
  var themeToggle = document.querySelector('[data-theme-toggle]');
  var template = document.querySelector('[data-task-template]');

  var tasks = loadTasks();
  var nextId = tasks.reduce(function (max, task) {
    return Math.max(max, task.id);
  }, 0) + 1;
  var query = '';
  var editingId = null;
  var searchTimer = null;
  var lastAnnouncedCount = null;

  function loadTasks() {
    var raw = null;
    try {
      raw = localStorage.getItem(TASKS_KEY);
    } catch (e) {
      return [];
    }
    if (!raw) return [];

    var data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return [];
    }
    if (!Array.isArray(data)) return [];

    var seen = {};
    var result = [];
    data.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      if (!Number.isSafeInteger(item.id) || item.id < 1 || seen[item.id]) return;
      if (typeof item.title !== 'string') return;
      var title = item.title.trim();
      if (!title) return;
      seen[item.id] = true;
      result.push({ id: item.id, title: title, done: item.done === true });
    });
    return result;
  }

  function saveTasks() {
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    } catch (e) { }
  }

  function findTask(id) {
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) return tasks[i];
    }
    return null;
  }

  function matchesQuery(task) {
    var q = query.trim().toLowerCase();
    return !q || task.title.toLowerCase().indexOf(q) !== -1;
  }

  function announce(message) {
    liveEl.textContent = '';
    window.setTimeout(function () {
      liveEl.textContent = message;
    }, 50);
  }

  function createTaskElement(task) {
    var item = template.content.firstElementChild.cloneNode(true);
    var check = item.querySelector('.js-task-check');
    var title = item.querySelector('.js-task-title');
    var edit = item.querySelector('.js-task-edit');
    var remove = item.querySelector('.js-task-delete');
    var prefix = 'task-' + task.id;

    item.dataset.taskId = String(task.id);
    item.dataset.done = task.done ? 'true' : 'false';
    item.hidden = !matchesQuery(task);

    check.id = prefix + '-done';
    check.checked = task.done;
    title.id = prefix + '-title';
    title.setAttribute('for', prefix + '-done');
    title.textContent = task.title;
    edit.id = prefix + '-edit';
    edit.setAttribute('aria-labelledby', prefix + '-edit ' + prefix + '-title');
    remove.id = prefix + '-delete';
    remove.setAttribute('aria-labelledby', prefix + '-delete ' + prefix + '-title');
    return item;
  }

  function render() {
    var ordered = tasks.filter(function (t) { return !t.done; })
      .concat(tasks.filter(function (t) { return t.done; }));
    var fragment = document.createDocumentFragment();
    var visible = 0;

    ordered.forEach(function (task) {
      var item = createTaskElement(task);
      if (!item.hidden) visible++;
      fragment.appendChild(item);
    });
    listEl.replaceChildren(fragment);

    var isEmpty = tasks.length === 0;
    var nothingFound = !isEmpty && visible === 0;
    listEl.hidden = visible === 0;
    emptyEl.hidden = !(isEmpty || nothingFound);
    if (isEmpty) {
      emptyTitleEl.textContent = 'Задач пока нет';
      emptyTextEl.textContent = 'Нажмите «Добавить задачу», чтобы создать первую.';
    } else if (nothingFound) {
      emptyTitleEl.textContent = 'Ничего не найдено';
      emptyTextEl.textContent = 'Попробуйте изменить поисковый запрос.';
    }
    return visible;
  }

  function focusById(id) {
    var el = document.getElementById(id);
    if (el && !el.closest('[hidden]')) {
      el.focus();
      return true;
    }
    return false;
  }

  function showError(message) {
    titleError.textContent = message;
    titleError.hidden = false;
    titleInput.setAttribute('aria-invalid', 'true');
    titleInput.setAttribute('aria-describedby', titleError.id);
  }

  function clearError() {
    titleError.textContent = '';
    titleError.hidden = true;
    titleInput.removeAttribute('aria-invalid');
    titleInput.removeAttribute('aria-describedby');
  }

  function openDialog(task) {
    editingId = task ? task.id : null;
    dialogTitle.textContent = task ? 'Редактировать задачу' : 'Новая задача';
    titleInput.value = task ? task.title : '';
    clearError();
    dialog.showModal();
  }

  function deleteTask(id) {
    var items = Array.prototype.slice.call(listEl.querySelectorAll('[data-task]'))
      .filter(function (el) { return !el.hidden; });
    var index = items.findIndex(function (el) { return el.dataset.taskId === String(id); });
    var neighbour = items[index + 1] || items[index - 1] || null;
    var neighbourId = neighbour ? neighbour.dataset.taskId : null;

    tasks = tasks.filter(function (t) { return t.id !== id; });
    saveTasks();
    render();
    announce('Задача удалена');

    if (!neighbourId || !focusById('task-' + neighbourId + '-done')) {
      addButton.focus();
    }
  }

  function taskIdFrom(target) {
    var item = target.closest('[data-task]');
    return item ? Number(item.dataset.taskId) : null;
  }

  listEl.addEventListener('change', function (event) {
    if (!event.target.classList.contains('js-task-check')) return;
    var id = taskIdFrom(event.target);
    var task = findTask(id);
    if (!task) return;
    task.done = event.target.checked;
    saveTasks();
    render();
    focusById('task-' + id + '-done');
  });

  listEl.addEventListener('click', function (event) {
    var editBtn = event.target.closest('.js-task-edit');
    var deleteBtn = event.target.closest('.js-task-delete');
    if (editBtn) {
      var task = findTask(taskIdFrom(editBtn));
      if (task) openDialog(task);
    } else if (deleteBtn) {
      deleteTask(taskIdFrom(deleteBtn));
    }
  });

  addButton.addEventListener('click', function () {
    openDialog(null);
  });

  cancelButton.addEventListener('click', function () {
    dialog.close();
  });

  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) dialog.close();
  });

  titleInput.addEventListener('input', clearError);

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var title = titleInput.value.trim();
    if (!title) {
      showError('Введите название задачи');
      titleInput.focus();
      return;
    }

    if (editingId !== null) {
      var task = findTask(editingId);
      if (task) task.title = title;
      announce('Задача изменена');
    } else {
      tasks.push({ id: nextId++, title: title, done: false });
      announce('Задача добавлена');
    }
    saveTasks();
    render();
    dialog.close();
  });

  dialog.addEventListener('close', function () {
    var id = editingId;
    editingId = null;
    if (id === null || !focusById('task-' + id + '-edit')) {
      addButton.focus();
    }
  });

  searchInput.addEventListener('input', function () {
    query = searchInput.value;
    var visible = render();
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(function () {
      if (!query.trim()) {
        lastAnnouncedCount = null;
        return;
      }
      if (visible !== lastAnnouncedCount) {
        lastAnnouncedCount = visible;
        announce('Найдено задач: ' + visible);
      }
    }, SEARCH_ANNOUNCE_DELAY);
  });

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function applyTheme(dark) {
    if (dark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    themeToggle.setAttribute('aria-pressed', String(dark));
  }

  themeToggle.addEventListener('click', function () {
    var dark = !isDark();
    applyTheme(dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch (e) { }
  });

  applyTheme(isDark());
  searchInput.value = '';
  render();
})();
