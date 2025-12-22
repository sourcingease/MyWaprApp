(function (global) {
  const AgentUI = {
    initModuleAgents,
    sendChat
  };

  async function fetchModules() {
    const res = await fetch('/api/agents/modules', { credentials: 'include' });
    const json = await res.json().catch(() => null);
    if (!json || !json.success) {
      throw new Error(json && json.error ? json.error : 'Failed to load agent modules');
    }
    return json.data || [];
  }

  async function sendChat(opts) {
    const body = {
      moduleId: opts.moduleId,
      tabId: opts.tabId,
      message: opts.text
    };
    const res = await fetch('/api/agents/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => null);
    if (!json || !json.success) {
      throw new Error(json && json.error ? json.error : 'Agent chat failed');
    }
    return json.data || {};
  }

  function ensureStylesOnce() {
    if (document.getElementById('agent-ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'agent-ui-styles';
    style.textContent = `
      .agent-ui-root{display:flex;flex-direction:column;gap:6px;font-family:inherit;font-size:13px}
      .agent-ui-tabs{display:flex;flex-wrap:wrap;gap:6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
      .agent-ui-tab{border:1px solid #e2e8f0;border-radius:999px;padding:4px 10px;background:#f8fafc;color:#64748b;cursor:pointer;font-size:12px;line-height:1.4}
      .agent-ui-tab.agent-ui-tab-active{background:#0ea5e9;color:#fff;border-color:#0ea5e9}
      .agent-ui-body{display:flex;gap:8px;min-height:180px}
      .agent-ui-sidebar{flex:0 0 180px;border:1px solid #e2e8f0;border-radius:8px;padding:8px;background:#f8fafc;display:flex;flex-direction:column;gap:4px}
      .agent-ui-sidebar-title{font-size:11px;font-weight:600;color:#64748b;margin-bottom:2px;text-transform:uppercase}
      .agent-ui-agent{padding:6px 8px;border-radius:6px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:6px}
      .agent-ui-agent span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .agent-ui-agent.agent-ui-agent-main{background:#e0f2fe;color:#0369a1;font-weight:600}
      .agent-ui-agent-bullet{width:8px;height:8px;border-radius:999px;background:#22c55e}
      .agent-ui-chat{flex:1;border:1px solid #e2e8f0;border-radius:8px;display:flex;flex-direction:column;overflow:hidden;background:#ffffff}
      .agent-ui-messages{flex:1;overflow-y:auto;padding:8px 10px;display:flex;flex-direction:column;gap:6px;font-size:12px;background:#f9fafb}
      .agent-ui-msg{max-width:100%;padding:6px 8px;border-radius:8px}
      .agent-ui-msg-user{align-self:flex-end;background:#0ea5e9;color:#fff}
      .agent-ui-msg-agent{align-self:flex-start;background:#e5e7eb;color:#111827}
      .agent-ui-input-row{display:flex;gap:6px;border-top:1px solid #e2e8f0;padding:6px;background:#f9fafb;align-items:flex-end;flex-wrap:wrap}
      .agent-ui-input-row textarea{flex:1 1 auto;border-radius:6px;border:1px solid #e5e7eb;font:inherit;font-size:12px;padding:6px 8px;min-height:34px;resize:vertical}
      .agent-ui-input-row button{border-radius:6px;border:0;padding:6px 10px;font-size:12px;font-weight:600;background:#0ea5e9;color:#fff;cursor:pointer}
      .agent-ui-file{flex:0 0 auto;font-size:11px}
      @media (max-width:768px){.agent-ui-body{flex-direction:column}.agent-ui-sidebar{flex:0 0 auto}}
    `;
    document.head.appendChild(style);
  }

  async function initModuleAgents(options) {
    const container = typeof options.containerSelector === 'string'
      ? document.querySelector(options.containerSelector)
      : options.container;
    if (!container) return;

    ensureStylesOnce();
    container.innerHTML = '<div style="font-size:12px;color:#64748b">Loading agents…</div>';

    let modules;
    try {
      modules = await fetchModules();
    } catch (e) {
      container.innerHTML = '<div style="font-size:12px;color:#ef4444">Failed to load agents: ' + escapeHtml(e.message || 'Unknown error') + '</div>';
      return;
    }

    const moduleId = options.moduleId;
    const mod = (modules || []).find(m => m && m.id === moduleId);
    if (!mod) {
      container.innerHTML = '<div style="font-size:12px;color:#64748b">No agent configuration found for module: ' + escapeHtml(moduleId) + '</div>';
      return;
    }

    let currentTabId = (mod.tabs && mod.tabs[0] && mod.tabs[0].id) || null;

    const root = document.createElement('div');
    root.className = 'agent-ui-root';

    const tabsEl = document.createElement('div');
    tabsEl.className = 'agent-ui-tabs';
    root.appendChild(tabsEl);

    const bodyEl = document.createElement('div');
    bodyEl.className = 'agent-ui-body';
    root.appendChild(bodyEl);

    const sidebarEl = document.createElement('div');
    sidebarEl.className = 'agent-ui-sidebar';
    bodyEl.appendChild(sidebarEl);

    const chatEl = document.createElement('div');
    chatEl.className = 'agent-ui-chat';
    bodyEl.appendChild(chatEl);

    const messagesEl = document.createElement('div');
    messagesEl.className = 'agent-ui-messages';
    chatEl.appendChild(messagesEl);

    const inputRow = document.createElement('div');
    inputRow.className = 'agent-ui-input-row';
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Ask the ' + (mod.name || moduleId) + ' agents…';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.className = 'agent-ui-file';
    fileInput.title = 'Attach a file';
    const sendBtn = document.createElement('button');
    sendBtn.type = 'button';
    sendBtn.textContent = 'Send';
    inputRow.appendChild(textarea);
    inputRow.appendChild(fileInput);
    inputRow.appendChild(sendBtn);
    chatEl.appendChild(inputRow);

    function renderTabs() {
      tabsEl.innerHTML = '';
      (mod.tabs || []).forEach(tab => {
        const btn = document.createElement('button');
        btn.className = 'agent-ui-tab' + (tab.id === currentTabId ? ' agent-ui-tab-active' : '');
        btn.textContent = tab.name || tab.id;
        btn.addEventListener('click', function () {
          currentTabId = tab.id;
          renderTabs();
          renderSidebar();
          appendSystemMessage('Switched to "' + (tab.name || tab.id) + '".');
        });
        tabsEl.appendChild(btn);
      });
    }

    function renderSidebar() {
      sidebarEl.innerHTML = '';
      const title = document.createElement('div');
      title.className = 'agent-ui-sidebar-title';
      title.textContent = (mod.name || moduleId) + ' Agents';
      sidebarEl.appendChild(title);

      const supRow = document.createElement('div');
      supRow.className = 'agent-ui-agent agent-ui-agent-main';
      const supDot = document.createElement('div');
      supDot.className = 'agent-ui-agent-bullet';
      const supLabel = document.createElement('span');
      supLabel.textContent = 'Supervisor';
      supRow.appendChild(supDot);
      supRow.appendChild(supLabel);
      sidebarEl.appendChild(supRow);

      const tab = (mod.tabs || []).find(t => t.id === currentTabId);
      if (tab) {
        const row = document.createElement('div');
        row.className = 'agent-ui-agent';
        const dot = document.createElement('div');
        dot.className = 'agent-ui-agent-bullet';
        const label = document.createElement('span');
        label.textContent = (tab.name || tab.id) + ' Agent';
        row.appendChild(dot);
        row.appendChild(label);
        sidebarEl.appendChild(row);
      }
    }

    function appendMessage(kind, text) {
      const div = document.createElement('div');
      div.className = 'agent-ui-msg ' + (kind === 'user' ? 'agent-ui-msg-user' : 'agent-ui-msg-agent');
      div.textContent = text;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function appendSystemMessage(text) {
      const div = document.createElement('div');
      div.className = 'agent-ui-msg agent-ui-msg-agent';
      div.style.opacity = '0.8';
      div.textContent = text;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    async function uploadFileIfAny() {
      const file = fileInput && fileInput.files && fileInput.files[0];
      if (!file) return null;

      // Special path: CRM Contacts + image card -> send binary to ingest-card endpoint
      const isCrmContacts = moduleId === 'crm' && currentTabId === 'contacts';
      if (isCrmContacts && file && file.type && file.type.startsWith('image/')) {
        try {
          const form = new FormData();
          form.append('file', file, file.name || 'card.png');
          const res = await fetch('/api/crm/contacts/ingest-card', {
            method: 'POST',
            credentials: 'include',
            body: form
          });
          let json = null;
          try { json = await res.json(); } catch (_) {}
          if (!res.ok || !json || !json.success) {
            const msg = (json && json.error) ? json.error : 'Failed to ingest visiting card';
            throw new Error(msg);
          }
          fileInput.value = '';
          const data = json.data || {};
          const sr = data.saveResult || {};
          let summary;
          if (sr.ok) {
            const parts = [];
            if (sr.companyName) parts.push(`company "${sr.companyName}"`);
            if (sr.personName) parts.push(`contact ${sr.personName}`);
            if (sr.email) parts.push(`email ${sr.email}`);
            summary = parts.length ? `Created ${parts.join(', ')} from visiting card.` : 'Created a new CRM contact from visiting card.';
          } else {
            summary = 'Visiting card OCR error: ' + (sr.message || 'unknown error');
          }
          // Return a textual note to include in the user message
          return summary;
        } catch (e) {
          throw e;
        }
      }

      // Default path: upload as data URL and return public URL note
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.onload = async () => {
          try {
            const dataUrl = reader.result;
            const res = await fetch('/api/uploads', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ dataUrl, filename: file.name || 'upload' })
            });

            let json = null;
            try {
              json = await res.json();
            } catch (_) {
              // not JSON; fall back to status/text below
            }

            if (!res.ok || !json || !json.success) {
              let msg = (json && json.error) ? json.error : '';
              if (!msg) {
                try {
                  const txt = await res.text();
                  msg = txt || 'Upload failed';
                } catch (_) {
                  msg = 'Upload failed';
                }
              }
              throw new Error(msg);
            }

            fileInput.value = '';
            const urlNote = json.url ? `Attached file: ${json.url}` : null;
            return resolve(urlNote);
          } catch (e) {
            return reject(e);
          }
        };
        reader.readAsDataURL(file);
      });
    }

    async function handleSend() {
      const raw = textarea.value || '';
      const baseText = raw.trim();
      if (!currentTabId && !baseText) return;

      let uploadedUrl = null;
      try {
        uploadedUrl = await uploadFileIfAny();
      } catch (e) {
        appendSystemMessage('File upload error: ' + (e && e.message ? e.message : 'Unknown error'));
      }

      let text = baseText;
      if (uploadedUrl) {
        const note = `Attached file: ${uploadedUrl}`;
        text = text ? (text + '\n\n' + note) : note;
      }

      if (!text) return;

      textarea.value = '';
      appendMessage('user', text);
      try {
        const reply = await sendChat({ moduleId, tabId: currentTabId, text });
        const agentText = reply && reply.text ? reply.text : '(no reply)';
        appendMessage('agent', agentText);
      } catch (e) {
        appendSystemMessage('Agent error: ' + (e && e.message ? e.message : 'Unknown error'));
      }
    }

    sendBtn.addEventListener('click', handleSend);
    textarea.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        handleSend();
      }
    });

    renderTabs();
    renderSidebar();
    messagesEl.innerHTML = '';
    appendSystemMessage('Supervisor and tab agents are ready for module "' + (mod.name || moduleId) + '".');

    container.innerHTML = '';
    container.appendChild(root);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] || c;
    });
  }

  global.AgentUI = AgentUI;
})(window);
