// Tasks API Client
// Endpoints expected:
// GET  /api/tasks?date=YYYY-MM-DD           -> { success: true, data: Task[] }
// POST /api/tasks                            -> { success: true, id }
// PUT  /api/tasks/:id                        -> { success: true }
// DELETE /api/tasks/:id                      -> { success: true }

(function(){
  async function api(path, method='GET', body){
    const opt={ method, headers:{ 'Content-Type':'application/json' } };
    if(body && method!=='GET') opt.body = JSON.stringify(body);
    const res = await fetch(path, opt);
    let json; try{ json = await res.json(); } catch{ json = { success: res.ok }; }
    if(!res.ok || json.success===false){
      const msg = (json && (json.error||json.message)) || res.statusText;
      throw new Error(msg||'Request failed');
    }
    return json;
  }

  async function listTasks(date){
    const r = await api(`/api/tasks?date=${encodeURIComponent(date)}`, 'GET');
    return r.data || [];
  }
  async function createTask(payload){
    const r = await api('/api/tasks','POST', payload);
    return r.id || r.data?.id;
  }
  async function updateTask(id, payload){
    await api(`/api/tasks/${encodeURIComponent(id)}`,'PUT', payload);
  }
  async function deleteTask(id){
    await api(`/api/tasks/${encodeURIComponent(id)}`,'DELETE');
  }

  window.TasksAPI = { listTasks, createTask, updateTask, deleteTask };
})();
