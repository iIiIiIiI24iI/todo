(function () {
  var todos = [];

  const todayEl = document.getElementById('today-todos');
  const todoListPendingEl = document.getElementById('todo-list-pending');
  const todoListInProgressEl = document.getElementById('todo-list-in_progress');
  const todoListDoneEl = document.getElementById('todo-list-done');
  const todoListChronologicalEl = document.getElementById('todo-list-chronological');
  const todoViewProgress = document.getElementById('todo-view-progress');
  const todoViewList = document.getElementById('todo-view-list');
  const btnViewProgress = document.getElementById('btn-view-progress');
  const btnViewList = document.getElementById('btn-view-list');
  const countPendingEl = document.getElementById('count-pending');
  const countInProgressEl = document.getElementById('count-in_progress');
  const countDoneEl = document.getElementById('count-done');

  var listViewMode = 'progress';
  var calendarClickTimer = null;
  var currentCalendarYear = null;
  var currentCalendarMonth = null;
  const calendarEl = document.getElementById('calendar');
  const btnAdd = document.getElementById('btn-add-todo');
  const modalOverlay = document.getElementById('modal-overlay');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancel = document.getElementById('btn-cancel');
  const form = document.getElementById('todo-form');
  const inputDate = document.getElementById('todo-date');
  const inputTime = document.getElementById('todo-time');
  const inputTitle = document.getElementById('todo-title');
  const inputDetail = document.getElementById('todo-detail');
  const inputEditId = document.getElementById('todo-edit-id');
  const modalTitleEl = document.getElementById('modal-title');
  const btnSubmitTodo = document.getElementById('btn-submit-todo');
  const dateModalOverlay = document.getElementById('date-modal-overlay');
  const dateModalTitle = document.getElementById('date-modal-title');
  const dateModalTasks = document.getElementById('date-modal-tasks');
  const btnCloseDateModal = document.getElementById('btn-close-date-modal');
  const phraseContentEl = document.getElementById('phrase-content');
  const phraseAuthorEl = document.getElementById('phrase-author');

  const STATUS_ORDER = ['pending', 'in_progress', 'done'];
  const STATUS_LABELS = { pending: '진행 전', in_progress: '진행 중', done: '완료' };
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  function getTodayString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function loadTodos() {
    return todos;
  }

  function saveTodos(updated) {
    todos = updated;
  }

  function openNewTodoForDate(dateKey) {
    if (inputEditId) inputEditId.value = '';
    inputDate.value = dateKey || getTodayString();
    inputTime.value = '';
    inputTitle.value = '';
    inputDetail.value = '';
    if (modalTitleEl) modalTitleEl.textContent = '새 할 일 추가';
    if (btnSubmitTodo) btnSubmitTodo.textContent = '추가하기';
    modalOverlay.classList.add('is-open');
    modalOverlay.setAttribute('aria-hidden', 'false');
    inputTitle.focus();
  }

  function openModal() {
    openNewTodoForDate(getTodayString());
  }

  function openEditModal(todo) {
    if (!todo) return;
    if (inputEditId) inputEditId.value = todo.id;
    inputDate.value = todo.date || '';
    inputTime.value = (todo.time || '').substring(0, 5) || '';
    inputTitle.value = todo.title || '';
    inputDetail.value = todo.detail || '';
    if (modalTitleEl) modalTitleEl.textContent = '할 일 수정';
    if (btnSubmitTodo) btnSubmitTodo.textContent = '저장';
    modalOverlay.classList.add('is-open');
    modalOverlay.setAttribute('aria-hidden', 'false');
    inputTitle.focus();
  }

  function closeModal() {
    modalOverlay.classList.remove('is-open');
    modalOverlay.setAttribute('aria-hidden', 'true');
  }

  function formatDisplayDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };
    return d.toLocaleDateString('ko-KR', options);
  }

  function getStatus(todo) {
    return STATUS_ORDER.includes(todo.status) ? todo.status : 'pending';
  }

  function cycleStatus(current) {
    const idx = STATUS_ORDER.indexOf(current);
    return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
  }

  function setTodoStatus(id, status) {
    const todos = loadTodos().map(function (t) {
      if (t.id === id) t.status = status;
      return t;
    });
    saveTodos(todos);
    render(todos);
  }

  function sortByTimeThenCreated(a, b) {
    var ta = a.time || '';
    var tb = b.time || '';
    if (ta !== tb) return (ta || 'zzz') < (tb || 'zzz') ? -1 : 1;
    return (a.createdAt || 0) - (b.createdAt || 0);
  }

  function renderTodayTodos(todos) {
    const today = getTodayString();
    const todayItems = todos
      .filter(function (t) { return t.date === today; })
      .sort(sortByTimeThenCreated);

    if (todayItems.length === 0) {
      todayEl.innerHTML = '<p class="empty-message">오늘 등록된 할 일이 없습니다.</p>';
      return;
    }

    todayEl.innerHTML = todayItems.map(function (t) {
      var status = getStatus(t);
      return '<div class="todo-item status-' + status + '">' + escapeHtml(t.title) + '</div>';
    }).join('');
  }

  function truncateTitle(title, maxLen) {
    if (!title) return '';
    var len = maxLen || 10;
    return title.length <= len ? title : title.substring(0, len) + '…';
  }

  function renderCalendar(todos) {
    var now = new Date();
    if (currentCalendarYear === null || currentCalendarMonth === null) {
      currentCalendarYear = now.getFullYear();
      currentCalendarMonth = now.getMonth();
    }
    var year = currentCalendarYear;
    var month = currentCalendarMonth;
    var todayYear = now.getFullYear();
    var todayMonth = now.getMonth();
    var todayDate = now.getDate();

    var first = new Date(year, month, 1);
    var last = new Date(year, month + 1, 0);
    var startBlank = first.getDay();
    var daysInMonth = last.getDate();

    var todosByDate = {};
    (todos || []).forEach(function (t) {
      if (!t.date) return;
      if (!todosByDate[t.date]) todosByDate[t.date] = [];
      todosByDate[t.date].push(t);
    });

    function dayCellHtml(key, dayNum, isToday, isOtherMonth) {
      var dayTasks = todosByDate[key] || [];
      var cls = 'calendar-day';
      if (isToday) cls += ' is-today';
      if (isOtherMonth) cls += ' other-month';
      var numHtml = '<span class="calendar-day-num">' + dayNum + '</span>';
      var tasksHtml = '';
      if (dayTasks.length > 0) {
        tasksHtml = '<div class="calendar-day-tasks">';
        dayTasks.forEach(function (t) {
          var status = getStatus(t);
          var short = truncateTitle(t.title, 10);
          tasksHtml += '<span class="cal-task status-' + status + '" title="' + escapeHtml(t.title) + '">' + escapeHtml(short) + '</span>';
        });
        tasksHtml += '</div>';
      }
      return '<div class="' + cls + '" data-date="' + escapeHtml(key) + '">' + numHtml + tasksHtml + '</div>';
    }

    var weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    var html = '<div class="calendar-header">';
    html += '<button type="button" class="cal-nav cal-prev" id="cal-prev" aria-label="이전 달">&#8249;</button>';
    html += '<span class="calendar-month-year">' + year + ' · ' + MONTH_NAMES[month] + '</span>';
    html += '<button type="button" class="cal-nav cal-next" id="cal-next" aria-label="다음 달">&#8250;</button>';
    html += '</div>';
    html += '<div class="calendar-weekdays">';
    weekdays.forEach(function (w) { html += '<span>' + w + '</span>'; });
    html += '</div>';
    html += '<div class="calendar-days">';

    for (var i = 0; i < startBlank; i++) {
      var prev = new Date(year, month, -startBlank + i + 1);
      var y = prev.getFullYear();
      var m = String(prev.getMonth() + 1).padStart(2, '0');
      var d = String(prev.getDate()).padStart(2, '0');
      var key = y + '-' + m + '-' + d;
      html += dayCellHtml(key, prev.getDate(), false, true);
    }
    for (var day = 1; day <= daysInMonth; day++) {
      var key = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      var isToday = (year === todayYear && month === todayMonth && day === todayDate);
      html += dayCellHtml(key, day, isToday, false);
    }
    var remaining = 42 - (startBlank + daysInMonth);
    for (var j = 0; j < remaining; j++) {
      var next = new Date(year, month + 1, j + 1);
      var y = next.getFullYear();
      var m = String(next.getMonth() + 1).padStart(2, '0');
      var d = String(next.getDate()).padStart(2, '0');
      var key = y + '-' + m + '-' + d;
      html += dayCellHtml(key, next.getDate(), false, true);
    }
    html += '</div>';
    calendarEl.innerHTML = html;

    var btnPrev = document.getElementById('cal-prev');
    var btnNext = document.getElementById('cal-next');
    if (btnPrev) {
      btnPrev.addEventListener('click', function (e) {
        e.stopPropagation();
        if (currentCalendarMonth === 0) {
          currentCalendarMonth = 11;
          currentCalendarYear -= 1;
        } else {
          currentCalendarMonth -= 1;
        }
        render(loadTodos());
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', function (e) {
        e.stopPropagation();
        if (currentCalendarMonth === 11) {
          currentCalendarMonth = 0;
          currentCalendarYear += 1;
        } else {
          currentCalendarMonth += 1;
        }
        render(loadTodos());
      });
    }

    calendarEl.querySelectorAll('.calendar-day').forEach(function (cell) {
      cell.addEventListener('click', function () {
        var dateKey = cell.getAttribute('data-date');
        if (!dateKey) return;
        if (calendarClickTimer) {
          clearTimeout(calendarClickTimer);
          calendarClickTimer = null;
        }
        calendarClickTimer = setTimeout(function () {
          openDateModal(dateKey);
          calendarClickTimer = null;
        }, 200);
      });
      cell.addEventListener('dblclick', function (e) {
        e.preventDefault();
        var dateKey = cell.getAttribute('data-date');
        if (!dateKey) return;
        if (calendarClickTimer) {
          clearTimeout(calendarClickTimer);
          calendarClickTimer = null;
        }
        openNewTodoForDate(dateKey);
      });
    });
  }

  function openDateModal(dateKey) {
    var todos = loadTodos().filter(function (t) { return t.date === dateKey; }).sort(sortByTimeThenCreated);
    var d = new Date(dateKey + 'T12:00:00');
    var label = d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
    dateModalTitle.textContent = label + ' 할 일';
    if (todos.length === 0) {
      dateModalTasks.innerHTML = '<p class="empty-col">해당 날짜에 등록된 할 일이 없습니다.</p>';
    } else {
      dateModalTasks.innerHTML = todos.map(function (t) {
        var status = getStatus(t);
        var timeStr = t.time ? t.time.substring(0, 5) : '—';
        return (
          '<div class="date-modal-task status-' + status + '">' +
            '<span class="task-time">' + escapeHtml(timeStr) + '</span>' +
            '<span class="task-title">' + escapeHtml(t.title) + '</span>' +
            '<span class="task-status">' + escapeHtml(STATUS_LABELS[status]) + '</span>' +
          '</div>'
        );
      }).join('');
    }
    dateModalOverlay.classList.add('is-open');
    dateModalOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeDateModal() {
    dateModalOverlay.classList.remove('is-open');
    dateModalOverlay.setAttribute('aria-hidden', 'true');
  }

  function buildTodoCardHtml(t) {
    var today = getTodayString();
    var status = getStatus(t);
    var isToday = t.date === today;
    var cardClass = 'todo-card status-' + status + (isToday ? ' is-today' : '');
    var titleClass = status === 'done' ? 'todo-title is-done' : 'todo-title';
    var detailHtml = t.detail
      ? '<div class="todo-detail">' + escapeHtml(t.detail) + '</div>'
      : '';
    return (
      '<div class="' + cardClass + '" data-id="' + escapeHtml(t.id) + '" draggable="true">' +
        '<div class="todo-date">' + escapeHtml(formatDisplayDate(t.date)) + '</div>' +
        '<div class="' + titleClass + '">' + escapeHtml(t.title) + '</div>' +
        detailHtml +
        '<div class="todo-actions">' +
          '<button type="button" class="btn-edit" data-edit-id="' + escapeHtml(t.id) + '" title="할 일 수정">수정</button>' +
          '<button type="button" class="btn-delete" data-delete-id="' + escapeHtml(t.id) + '">삭제</button>' +
        '</div>' +
      '</div>'
    );
  }

  function bindCardActions(container) {
    if (!container) return;
    container.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        deleteTodo(btn.getAttribute('data-delete-id'));
      });
    });
    container.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-edit-id');
        var todos = loadTodos();
        var todo = todos.filter(function (t) { return t.id === id; })[0];
        if (todo) openEditModal(todo);
      });
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function deleteTodo(id) {
    if (!confirm('이 할 일을 삭제할까요?')) return;
    const todos = loadTodos().filter(function (t) { return t.id !== id; });
    saveTodos(todos);
    render(todos);
  }

  function setListViewMode(mode) {
    listViewMode = mode;
    if (todoViewProgress) todoViewProgress.classList.toggle('is-hidden', mode !== 'progress');
    if (todoViewList) todoViewList.classList.toggle('is-hidden', mode !== 'list');
    if (btnViewProgress) {
      btnViewProgress.classList.toggle('is-active', mode === 'progress');
      btnViewProgress.setAttribute('aria-pressed', mode === 'progress' ? 'true' : 'false');
    }
    if (btnViewList) {
      btnViewList.classList.toggle('is-active', mode === 'list');
      btnViewList.setAttribute('aria-pressed', mode === 'list' ? 'true' : 'false');
    }
  }

  function renderTodoList(todos) {
    var sortByDateThenCreated = function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return (a.createdAt || 0) - (b.createdAt || 0);
    };

    if (listViewMode === 'list') {
      if (!todoListChronologicalEl) return;
      var chronological = todos.slice().sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        var ta = a.time || '';
        var tb = b.time || '';
        if (ta !== tb) return (ta || 'zzz') < (tb || 'zzz') ? -1 : 1;
        return (a.createdAt || 0) - (b.createdAt || 0);
      });
      if (chronological.length === 0) {
        todoListChronologicalEl.innerHTML = '<p class="empty-message">등록된 할 일이 없습니다.</p>';
      } else {
        todoListChronologicalEl.innerHTML = chronological.map(buildTodoCardHtml).join('');
        bindCardActions(todoListChronologicalEl);
      }
      return;
    }

    var byStatus = { pending: [], in_progress: [], done: [] };
    todos.forEach(function (t) {
      var s = getStatus(t);
      if (byStatus[s]) byStatus[s].push(t);
    });

    ['pending', 'in_progress', 'done'].forEach(function (status) {
      var list = byStatus[status];
      list.sort(sortByDateThenCreated);
      var el = status === 'pending' ? todoListPendingEl : status === 'in_progress' ? todoListInProgressEl : todoListDoneEl;
      var countEl = status === 'pending' ? countPendingEl : status === 'in_progress' ? countInProgressEl : countDoneEl;
      if (!el) return;
      countEl.textContent = list.length;
      el.setAttribute('data-status', status);
      if (list.length === 0) {
        el.innerHTML = '<p class="empty-col">없음</p>';
      } else {
        el.innerHTML = list.map(buildTodoCardHtml).join('');
        bindCardActions(el);
      }
      bindDragDrop(el);
    });
  }

  function bindDragDrop(columnInner) {
    if (!columnInner) return;
    columnInner.querySelectorAll('.todo-card').forEach(function (card) {
      card.addEventListener('dragstart', function (e) {
        e.dataTransfer.setData('text/plain', card.getAttribute('data-id'));
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', function () {
        card.classList.remove('dragging');
        document.querySelectorAll('.todo-col-inner').forEach(function (col) { col.classList.remove('drag-over'); });
      });
    });
  }

  function initDropZones() {
    [todoListPendingEl, todoListInProgressEl, todoListDoneEl].forEach(function (columnInner) {
      if (!columnInner) return;
      columnInner.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        columnInner.classList.add('drag-over');
      });
      columnInner.addEventListener('dragleave', function () {
        columnInner.classList.remove('drag-over');
      });
      columnInner.addEventListener('drop', function (e) {
        e.preventDefault();
        columnInner.classList.remove('drag-over');
        var id = e.dataTransfer.getData('text/plain');
        var s = columnInner.getAttribute('data-status');
        if (id && s) {
          var todos = loadTodos();
          var t = todos.filter(function (x) { return x.id === id; })[0];
          if (t && getStatus(t) !== s) setTodoStatus(id, s);
        }
      });
    });
  }

  function render(todos) {
    if (todos === undefined) todos = loadTodos();
    renderCalendar(todos);
    renderTodayTodos(todos);
    renderTodoList(todos);
  }

  function loadPhraseOfTheDay() {
    if (!phraseContentEl) return;
    phraseContentEl.innerHTML = '<p class="phrase-loading">불러오는 중…</p>';
    if (phraseAuthorEl) phraseAuthorEl.textContent = '';

    var fallback = function () {
      var fallbacks = [
        { q: 'The only way to do great work is to love what you do.', a: 'Steve Jobs' },
        { q: '오늘 할 일을 내일로 미루지 마라.', a: '벤자민 프랭클린' },
        { q: 'Small steps lead to big changes.', a: 'Unknown' }
      ];
      var i = Math.floor(Math.random() * fallbacks.length);
      phraseContentEl.innerHTML = '<p class="phrase-text">' + escapeHtml(fallbacks[i].q) + '</p>';
      if (phraseAuthorEl) phraseAuthorEl.textContent = '— ' + fallbacks[i].a;
    };

    fetch('https://zenquotes.io/api/random')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data[0] && data[0].q) {
          phraseContentEl.innerHTML = '<p class="phrase-text">' + escapeHtml(data[0].q) + '</p>';
          if (phraseAuthorEl) phraseAuthorEl.textContent = '— ' + (data[0].a || 'Unknown');
        } else {
          fallback();
        }
      })
      .catch(function () { fallback(); });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const date = inputDate.value.trim();
    const time = (inputTime && inputTime.value) ? inputTime.value.trim() : '';
    const title = inputTitle.value.trim();
    const detail = inputDetail.value.trim();
    const editId = inputEditId && inputEditId.value ? inputEditId.value.trim() : '';

    if (!date || !title) return;

    const todos = loadTodos();
    if (editId) {
      var existing = todos.filter(function (t) { return t.id === editId; })[0];
      if (existing) {
        existing.date = date;
        existing.time = time;
        existing.title = title;
        existing.detail = detail;
        saveTodos(todos);
        render(todos);
        closeModal();
      }
      return;
    }
    const newTodo = {
      id: 'id-' + Date.now(),
      date: date,
      time: time,
      title: title,
      detail: detail,
      status: 'pending',
      createdAt: Date.now()
    };
    todos.push(newTodo);
    saveTodos(todos);
    render(todos);
    closeModal();
  });

  btnAdd.addEventListener('click', openModal);
  btnCloseModal.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);

  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeModal();
  });

  if (btnCloseDateModal) btnCloseDateModal.addEventListener('click', closeDateModal);
  if (dateModalOverlay) {
    dateModalOverlay.addEventListener('click', function (e) {
      if (e.target === dateModalOverlay) closeDateModal();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (modalOverlay.classList.contains('is-open')) closeModal();
      else if (dateModalOverlay && dateModalOverlay.classList.contains('is-open')) closeDateModal();
    }
  });

  if (btnViewProgress) {
    btnViewProgress.addEventListener('click', function () {
      setListViewMode('progress');
      render(loadTodos());
    });
  }
  if (btnViewList) {
    btnViewList.addEventListener('click', function () {
      setListViewMode('list');
      render(loadTodos());
    });
  }

  initDropZones();
  render();
  loadPhraseOfTheDay();
})();
