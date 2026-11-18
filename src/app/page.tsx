'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Camera, Plus, CheckCircle2, Circle, DollarSign, Clock,
  LogOut, FolderKanban, Trash2, TrendingUp, AlertCircle
} from 'lucide-react';

type Proyecto = {
  id: string;
  nombre: string;
  cliente: string;
  ubicacion: string;
  estado: 'En cotización' | 'En ejecución' | 'Finalizado';
  presupuesto_clp: number;
  valor_hora_hh: number;
  fecha_inicio: string;
};

type Actividad = {
  id: string;
  proyecto_id: string;
  titulo: string;
  tecnico_asignado: string;
  completada: boolean;
};

type Gasto = {
  id: string;
  proyecto_id: string;
  descripcion: string;
  categoria: string;
  monto_clp: number;
  fecha: string;
};

type RegistroTiempo = {
  id: string;
  proyecto_id: string;
  tecnico: string;
  horas: number;
  tarea: string;
  fecha: string;
};

const formatCLP = (val: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);

export default function SecurControlApp() {
  const [session, setSession] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Datos principales
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [tiempos, setTiempos] = useState<RegistroTiempo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'actividades' | 'gastos' | 'tiempo'>('actividades');

  // Modales y formularios
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProj, setNewProj] = useState({
    nombre: '', cliente: '', ubicacion: '', estado: 'En ejecución', presupuesto_clp: 1500000, valor_hora_hh: 15000
  });

  const [newAct, setNewAct] = useState({ titulo: '', tecnico_asignado: '' });
  const [newGasto, setNewGasto] = useState({ descripcion: '', categoria: 'Materiales/Equipos', monto_clp: 0 });
  const [newTiempo, setNewTiempo] = useState({ tecnico: '', horas: 4, tarea: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
      if (session) fetchAllData();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchAllData();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAllData = async () => {
    const [pRes, aRes, gRes, tRes] = await Promise.all([
      supabase.from('proyectos').select('*').order('created_at', { ascending: false }),
      supabase.from('actividades').select('*').order('created_at', { ascending: true }),
      supabase.from('gastos').select('*').order('fecha', { ascending: false }),
      supabase.from('registros_tiempo').select('*').order('fecha', { ascending: false }),
    ]);

    if (pRes.data) {
      setProyectos(pRes.data);
      if (!selectedId && pRes.data.length > 0) setSelectedId(pRes.data[0].id);
    }
    if (aRes.data) setActividades(aRes.data);
    if (gRes.data) setGastos(gRes.data);
    if (tRes.data) setTiempos(tRes.data);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError('Credenciales inválidas. Verifica correo y contraseí±a.');
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.from('proyectos').insert([newProj]).select().single();
    if (!error && data) {
      setProyectos([data, ...proyectos]);
      setSelectedId(data.id);
      setShowNewProject(false);
      setNewProj({ nombre: '', cliente: '', ubicacion: '', estado: 'En ejecución', presupuesto_clp: 1500000, valor_hora_hh: 15000 });
    }
  };

  const toggleActividad = async (act: Actividad) => {
    const { error } = await supabase.from('actividades').update({ completada: !act.completada }).eq('id', act.id);
    if (!error) {
      setActividades(actividades.map(a => a.id === act.id ? { ...a, completada: !a.completada } : a));
    }
  };

  const addActividad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !newAct.titulo) return;
    const { data, error } = await supabase
      .from('actividades')
      .insert([{ proyecto_id: selectedId, ...newAct }])
      .select()
      .single();
    if (!error && data) {
      setActividades([...actividades, data]);
      setNewAct({ titulo: '', tecnico_asignado: '' });
    }
  };

  const addGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !newGasto.descripcion || newGasto.monto_clp <= 0) return;
    const { data, error } = await supabase
      .from('gastos')
      .insert([{ proyecto_id: selectedId, ...newGasto }])
      .select()
      .single();
    if (!error && data) {
      setGastos([data, ...gastos]);
      setNewGasto({ descripcion: '', categoria: 'Materiales/Equipos', monto_clp: 0 });
    }
  };

  const addTiempo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !newTiempo.tecnico || newTiempo.horas <= 0) return;
    const { data, error } = await supabase
      .from('registros_tiempo')
      .insert([{ proyecto_id: selectedId, ...newTiempo }])
      .select()
      .single();
    if (!error && data) {
      setTiempos([data, ...tiempos]);
      setNewTiempo({ tecnico: '', horas: 4, tarea: '' });
    }
  };

  if (loadingAuth) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Cargando sistema...</div>;

  // Pantalla de Login
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-600 rounded-xl text-white"><Camera className="w-7 h-7" /></div>
            <div>
              <h1 className="text-2xl font-bold text-white">SecurControl</h1>
              <p className="text-xs text-slate-400">Gestión de Proyectos & Obras CCTV</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Correo Corporativo</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="admin@tuempresa.cl"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Contraseí±a</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="*************"
              />
            </div>
            {authError && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle className="w-4 h-4" />{authError}</p>}
            <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition">
              Ingresar al Sistema
            </button>
          </form>
        </div>
      </div>
    );
  }

  const currentProj = proyectos.find(p => p.id === selectedId);
  const projActs = actividades.filter(a => a.proyecto_id === selectedId);
  const projGastos = gastos.filter(g => g.proyecto_id === selectedId);
  const projTiempos = tiempos.filter(t => t.proyecto_id === selectedId);

  const totalGastos = projGastos.reduce((acc, g) => acc + Number(g.monto_clp), 0);
  const totalHoras = projTiempos.reduce((acc, t) => acc + Number(t.horas), 0);
  const costoManoObra = currentProj ? totalHoras * Number(currentProj.valor_hora_hh) : 0;
  const costoTotal = totalGastos + costoManoObra;
  const utilidadNeta = currentProj ? Number(currentProj.presupuesto_clp) - costoTotal : 0;
  const avancePct = projActs.length > 0 ? Math.round((projActs.filter(a => a.completada).length / projActs.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg"><Camera className="w-6 h-6 text-white" /></div>
          <div>
            <h1 className="font-bold text-lg leading-tight">SecurControl Cloud</h1>
            <p className="text-xs text-slate-400">Control de Obras, Gastos y HH en Tiempo Real</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" /> Nuevo Proyecto
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista de Proyectos */}
        <aside className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <FolderKanban className="w-4 h-4" /> Proyectos Activos ({proyectos.length})
          </h2>
          {proyectos.map(p => (
            <div
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`p-4 rounded-xl border cursor-pointer transition ${
                selectedId === p.id ? 'bg-slate-900 border-blue-500 shadow-lg' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-white">{p.nombre}</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {p.estado}
                </span>
              </div>
              <p className="text-xs text-slate-400">{p.cliente} â€¢ {p.ubicacion}</p>
              <p className="text-sm font-semibold text-emerald-400 mt-2">{formatCLP(p.presupuesto_clp)}</p>
            </div>
          ))}
        </aside>

        {/* Detalle del Proyecto Seleccionado */}
        <section className="lg:col-span-8">
          {currentProj ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex flex-wrap justify-between items-start gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{currentProj.nombre}</h2>
                  <p className="text-sm text-slate-400">{currentProj.cliente} â€” {currentProj.ubicacion}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Avance Técnico</span>
                  <span className="text-2xl font-bold text-blue-400">{avancePct}%</span>
                </div>
              </div>

              {/* KPIs Financieros */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400">Presupuesto</span>
                  <p className="text-lg font-bold text-white mt-0.5">{formatCLP(currentProj.presupuesto_clp)}</p>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400">Gastos Materiales</span>
                  <p className="text-lg font-bold text-amber-400 mt-0.5">{formatCLP(totalGastos)}</p>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400">Mano de Obra ({totalHoras}h)</span>
                  <p className="text-lg font-bold text-purple-400 mt-0.5">{formatCLP(costoManoObra)}</p>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400">Utilidad Neta</span>
                  <p className={`text-lg font-bold mt-0.5 ${utilidadNeta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCLP(utilidadNeta)}
                  </p>
                </div>
              </div>

              {/* Pestaí±as */}
              <div className="flex gap-2 border-b border-slate-800 pb-2">
                {(['actividades', 'gastos', 'tiempo'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                      activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {tab === 'actividades' ? `Hitos (${projActs.length})` : tab === 'gastos' ? `Gastos (${projGastos.length})` : `Horas HH (${totalHoras}h)`}
                  </button>
                ))}
              </div>

              {/* Contenido Pestaí±a: Actividades */}
              {activeTab === 'actividades' && (
                <div className="space-y-4">
                  <form onSubmit={addActividad} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text" required placeholder="Nueva tarea (ej. Montaje cámaras exterior)"
                      value={newAct.titulo} onChange={e => setNewAct({ ...newAct, titulo: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm"
                    />
                    <input
                      type="text" placeholder="Técnico"
                      value={newAct.tecnico_asignado} onChange={e => setNewAct({ ...newAct, tecnico_asignado: e.target.value })}
                      className="sm:w-40 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm"
                    />
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium">Agregar</button>
                  </form>
                  <div className="space-y-2">
                    {projActs.map(act => (
                      <div
                        key={act.id}
                        onClick={() => toggleActividad(act)}
                        className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700"
                      >
                        <div className="flex items-center gap-3">
                          {act.completada ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Circle className="w-5 h-5 text-slate-600" />}
                          <span className={act.completada ? 'line-through text-slate-500' : 'text-slate-200'}>{act.titulo}</span>
                        </div>
                        {act.tecnico_asignado && <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-md text-slate-300">{act.tecnico_asignado}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contenido Pestaí±a: Gastos */}
              {activeTab === 'gastos' && (
                <div className="space-y-4">
                  <form onSubmit={addGasto} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="text" required placeholder="Descripción (ej. 4 Cámaras Domo)"
                      value={newGasto.descripcion} onChange={e => setNewGasto({ ...newGasto, descripcion: e.target.value })}
                      className="sm:col-span-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm"
                    />
                    <input
                      type="number" required placeholder="Monto CLP"
                      value={newGasto.monto_clp || ''} onChange={e => setNewGasto({ ...newGasto, monto_clp: Number(e.target.value) })}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm"
                    />
                    <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium">Registrar Gasto</button>
                  </form>
                  <div className="space-y-2">
                    {projGastos.map(g => (
                      <div key={g.id} className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-white">{g.descripcion}</p>
                          <p className="text-xs text-slate-400">{g.categoria} â€¢ {g.fecha}</p>
                        </div>
                        <span className="font-semibold text-amber-400">{formatCLP(g.monto_clp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contenido Pestaí±a: Tiempo */}
              {activeTab === 'tiempo' && (
                <div className="space-y-4">
                  <form onSubmit={addTiempo} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="text" required placeholder="Nombre Técnico"
                      value={newTiempo.tecnico} onChange={e => setNewTiempo({ ...newTiempo, tecnico: e.target.value })}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm"
                    />
                    <input
                      type="number" step="0.5" required placeholder="Horas"
                      value={newTiempo.horas} onChange={e => setNewTiempo({ ...newTiempo, horas: Number(e.target.value) })}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm"
                    />
                    <input
                      type="text" required placeholder="Labor realizada"
                      value={newTiempo.tarea} onChange={e => setNewTiempo({ ...newTiempo, tarea: e.target.value })}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm"
                    />
                    <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium">Cargar Horas</button>
                  </form>
                  <div className="space-y-2">
                    {projTiempos.map(t => (
                      <div key={t.id} className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-white">{t.tecnico} â€” <span className="text-slate-400 font-normal">{t.tarea}</span></p>
                          <p className="text-xs text-slate-500">{t.fecha}</p>
                        </div>
                        <span className="font-semibold text-purple-400">{t.horas} hrs</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              Selecciona o crea un proyecto para comenzar.
            </div>
          )}
        </section>
      </main>

      {/* Modal Nuevo Proyecto */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Crear Nuevo Proyecto CCTV</h3>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <input
                type="text" required placeholder="Nombre de la obra (ej. 8 Cámaras IP Local Comercial)"
                value={newProj.nombre} onChange={e => setNewProj({ ...newProj, nombre: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm"
              />
              <input
                type="text" required placeholder="Cliente / Empresa"
                value={newProj.cliente} onChange={e => setNewProj({ ...newProj, cliente: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm"
              />
              <input
                type="text" placeholder="Ubicación / Comuna"
                value={newProj.ubicacion} onChange={e => setNewProj({ ...newProj, ubicacion: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400">Presupuesto Cotizado (CLP)</label>
                  <input
                    type="number" required value={newProj.presupuesto_clp}
                    onChange={e => setNewProj({ ...newProj, presupuesto_clp: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Costo Hora HH (CLP)</label>
                  <input
                    type="number" required value={newProj.valor_hora_hh}
                    onChange={e => setNewProj({ ...newProj, valor_hora_hh: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNewProject(false)} className="px-4 py-2 text-sm text-slate-400">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium">Crear Obra</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
