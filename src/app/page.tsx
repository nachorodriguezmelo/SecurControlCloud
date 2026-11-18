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
  imagen_url?: string; // <-- Agregado aquí correctamente
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

  // Estado para la imagen del hito (colocado correctamente dentro del componente)
  const [imageFile, setImageFile] = useState<File | null>(null);
  // Modales y formularios
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProj, setNewProj] = useState({
    nombre: '', cliente: '', ubicacion: '', estado: 'En ejecución', presupuesto_clp: 1500000, valor_hora_hh: 15000
  });

  const [newAct, setNewAct] = useState({ titulo: '', tecnico_asignado: '' });
  const [newGasto, setNewGasto] = useState({ descripcion: '', categoria: 'Materiales/Equipos', monto_clp: 0 });
  const [newTiempo, setNewTiempo] = useState({ tecnico: '', horas: 4, tarea: '' });


  const [busqueda, setBusqueda] = useState('');

const proyectosFiltrados = proyectos.filter(p => 
  p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
  p.cliente.toLowerCase().includes(busqueda.toLowerCase())
);

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

const addActividad = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newAct.titulo.trim() || !selectedId) return;

  let imageUrl = null;

  // 1. Subir la imagen al Storage si el usuario seleccionó una
  if (imageFile) {
    const fileName = `${Date.now()}-${imageFile.name.replace(/\s+/g, '_')}`;
    const { error: uploadError } = await supabase.storage
      .from('hitos-evidencias')
      .upload(fileName, imageFile);

    if (uploadError) {
      alert("Error al subir la imagen: " + uploadError.message);
      return;
    }

    const { data: publicData } = supabase.storage
      .from('hitos-evidencias')
      .getPublicUrl(fileName);

    imageUrl = publicData.publicUrl;
  }

  // 2. Insertar en la base de datos
  const { error } = await supabase.from('actividades').insert([
    {
      proyecto_id: selectedId,
      titulo: newAct.titulo,
      tecnico_asignado: newAct.tecnico_asignado,
      completada: false,
      imagen_url: imageUrl
    } as any
  ]);

  if (error) {
    alert("Error al guardar la actividad: " + error.message);
  } else {
    setNewAct({ titulo: '', tecnico_asignado: '' });
    setImageFile(null);
    // Asegúrate de usar aquí la función con la que recargas los datos en tu app
    // (si se llama distinto, mantén tu función original de recarga)
  }
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

const selectedProyecto = proyectos.find(p => p.id === selectedId)

  const eliminarGasto = async (id: string) => {
    const { error } = await supabase.from('gastos').delete().eq('id', id);
    if (!error) {
      setGastos(gastos.filter(g => g.id !== id));
    } else {
      alert("Error al eliminar el gasto: " + error.message);
    }
  };

const eliminarTiempo = async (id: string) => {
    const { error } = await supabase.from('registros_tiempo').delete().eq('id', id);
    if (!error) {
      setTiempos(tiempos.filter(t => t.id !== id));
    } else {
      alert("Error al eliminar el registro: " + error.message);
    }
  };

// Cambiar el estado del proyecto a "Finalizado" (o "En ejecución")
  const cambiarEstadoProyecto = async (nuevoEstado: 'En ejecución' | 'Finalizado') => {
    if (!selectedId) return;

    const { error } = await supabase
      .from('proyectos')
      .update({ estado: nuevoEstado })
      .eq('id', selectedId);

    if (!error) {
      // Actualizamos el estado localmente para que se refleje de inmediato
      setProyectos(proyectos.map(p => p.id === selectedId ? { ...p, estado: nuevoEstado } : p));
    } else {
      alert("Error al actualizar el estado: " + error.message);
    }
  };

  // Función opcional para eliminar un proyecto completo si fuera necesario
  const eliminarProyecto = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este proyecto y todos sus registros asociados?")) return;

    const { error } = await supabase.from('proyectos').delete().eq('id', id);
    if (!error) {
      setProyectos(proyectos.filter(p => p.id !== id));
      setSelectedId(null);
    } else {
      alert("Error al eliminar el proyecto: " + error.message);
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
              <p className="text-xs text-slate-400">{p.cliente} & {p.ubicacion}</p>
              <p className="text-sm font-semibold text-emerald-400 mt-2">{formatCLP(p.presupuesto_clp)}</p>
            </div>
          ))}


  {/* Botones de control de estado del proyecto actual */}
{selectedProyecto && (
  <div className="flex items-center gap-2 mb-4">
    {selectedProyecto.estado !== 'Finalizado' ? (
      <button
        onClick={() => cambiarEstadoProyecto('Finalizado')}
        className="px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
      >
        <CheckCircle2 className="w-3.5 h-3.5" /> Marcar como Finalizado
      </button>
    ) : (
      <button
        onClick={() => cambiarEstadoProyecto('En ejecución')}
        className="px-3 py-1.5 bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
      >
        <FolderKanban className="w-3.5 h-3.5" /> Reabrir Proyecto
      </button>
    )}

    <button
      onClick={() => eliminarProyecto(selectedProyecto.id)}
      className="px-3 py-1.5 bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 text-red-400 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ml-auto"
    >
      <Trash2 className="w-3.5 h-3.5" /> Eliminar Proyecto
    </button>
  </div>
)}


        </aside>

        {/* Detalle del Proyecto Seleccionado */}
        <section className="lg:col-span-8">
          {currentProj ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex flex-wrap justify-between items-start gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{currentProj.nombre}</h2>
                  <p className="text-sm text-slate-400">{currentProj.cliente} & {currentProj.ubicacion}</p>
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


{/* Tarjetas de Resumen (Presupuesto, Gastos, etc.) */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  {/* ... tus tarjetas de resumen actuales ... */}
</div>

{/* ========================================== */}
{/* PEGA LAS PESTAÑAS EXACTAMENTE AQUÍ        */}
{/* ========================================== */}
<div className="flex border-b border-slate-800 mb-4">
  <button
    onClick={() => setActiveTab('actividades')}
    className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
      activeTab === 'actividades'
        ? 'border-blue-500 text-blue-400'
        : 'border-transparent text-slate-400 hover:text-slate-200'
    }`}
  >
    Hitos / Actividades
  </button>
  <button
    onClick={() => setActiveTab('gastos')}
    className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
      activeTab === 'gastos'
        ? 'border-blue-500 text-blue-400'
        : 'border-transparent text-slate-400 hover:text-slate-200'
    }`}
  >
    Gastos ($)
  </button>
  <button
    onClick={() => setActiveTab('tiempo')}
    className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
      activeTab === 'tiempo'
        ? 'border-blue-500 text-blue-400'
        : 'border-transparent text-slate-400 hover:text-slate-200'
    }`}
  >
    Horas HH
  </button>
</div>

{/* Contenido Pestaña: Actividades */}
{activeTab === 'actividades' && (
  <div className="space-y-4">
    {/* Tu formulario de actividades y lista de hitos */}
  </div>
)}

{/* Contenido Pestaña: Gastos */}
{activeTab === 'gastos' && (
  <div className="space-y-4">
    {/* Tu formulario de gastos y lista */}
  </div>
)}

{/* Contenido Pestaña: Tiempo */}
{activeTab === 'tiempo' && (
  <div className="space-y-4">
    {/* Tu formulario de tiempo y lista */}
  </div>
)}
         {/* Contenido Pestaña: Actividades */}
              {activeTab === 'actividades' && (
                <div className="space-y-4">
                  <form onSubmit={addActividad} className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text" required placeholder="Nueva tarea (ej. Montaje cámaras exterior)"
                        value={newAct.titulo} onChange={e => setNewAct({ ...newAct, titulo: e.target.value })}
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
                      />
                      <input
                        type="text" placeholder="Técnico"
                        value={newAct.tecnico_asignado} onChange={e => setNewAct({ ...newAct, tecnico_asignado: e.target.value })}
                        className="sm:w-40 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
                      />
                    </div>

                    {/* Selector de archivos y cámara móvil */}
                    <div className="flex items-center gap-2">
                      <label className="flex-1 flex items-center justify-center px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-400 cursor-pointer hover:border-slate-700">
                        <span className="truncate">{imageFile ? `📸 ${imageFile.name}` : '📷 Adjuntar foto o abrir cámara'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={e => setImageFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                      {imageFile && (
                        <button
                          type="button"
                          onClick={() => setImageFile(null)}
                          className="px-3 py-2 bg-red-950/50 border border-red-900 text-red-400 rounded-lg text-sm"
                        >
                          Quitar
                        </button>
                      )}
                      <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white">Agregar</button>
                    </div>
                  </form>

                  <div className="space-y-2">
                    {projActs.map(act => (
                      <div
                        key={act.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl gap-3 hover:border-slate-700"
                      >
                        <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleActividad(act)}>
                          {act.completada ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" /> : <Circle className="w-5 h-5 text-slate-600 flex-shrink-0" />}
                          <span className={act.completada ? 'line-through text-slate-500 text-sm' : 'text-slate-200 text-sm'}>{act.titulo}</span>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          {/* Miniatura de la evidencia fotográfica */}
                          {(act as any).imagen_url && (
                            <a href={(act as any).imagen_url} target="_blank" rel="noopener noreferrer" className="block">
                              <img src={(act as any).imagen_url} alt="Evidencia hito" className="w-10 h-10 object-cover rounded-lg border border-slate-700 hover:opacity-80 transition shadow-sm" />
                            </a>
                          )}
                          {act.tecnico_asignado && <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-md text-slate-300">{act.tecnico_asignado}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contenido Pestaña: Gastos */}
              {activeTab === 'gastos' && (
                <div className="space-y-4">
                  <form onSubmit={addGasto} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text" required placeholder="Descripción del gasto (ej. Cable UTP, Conectores)"
                      value={newGasto.descripcion} onChange={e => setNewGasto({ ...newGasto, descripcion: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
                    />
                    <input
                      type="number" required placeholder="Monto (CLP)"
                      value={newGasto.monto_clp || ''} onChange={e => setNewGasto({ ...newGasto, monto_clp: Number(e.target.value) })}
                      className="sm:w-36 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
                    />
                    <select
                      value={newGasto.categoria} onChange={e => setNewGasto({ ...newGasto, categoria: e.target.value })}
                      className="sm:w-40 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
                    >
                      <option value="Materiales">Materiales</option>
                      <option value="Herramientas">Herramientas</option>
                      <option value="Transporte">Transporte</option>
                      <option value="Otros">Otros</option>
                    </select>
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white">Agregar</button>
                  </form>

                  <div className="space-y-2">
                    {projGastos.map(gasto => (
                      <div
                        key={gasto.id}
                        className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-700"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-200">{gasto.descripcion}</p>
                          <span className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{gasto.categoria}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-emerald-400">{formatCLP(gasto.monto_clp)}</span>
                          <button
                            onClick={() => eliminarGasto(gasto.id)}
                            className="text-slate-600 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

             {/* Contenido Pestaña: Tiempo (Horas HH) */}
              {activeTab === 'tiempo' && (
                <div className="space-y-4">
                  <form onSubmit={addTiempo} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text" required placeholder="Tarea o labor realizada"
                      value={newTiempo.tarea} onChange={e => setNewTiempo({ ...newTiempo, tarea: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
                    />
                    <input
                      type="text" required placeholder="Técnico"
                      value={newTiempo.tecnico} onChange={e => setNewTiempo({ ...newTiempo, tecnico: e.target.value })}
                      className="sm:w-40 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
                    />
                    <input
                      type="number" required placeholder="Horas" step="0.5"
                      value={newTiempo.horas || ''} onChange={e => setNewTiempo({ ...newTiempo, horas: Number(e.target.value) })}
                      className="sm:w-28 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200"
                    />
                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white">Registrar</button>
                  </form>

                  <div className="space-y-2">
                    {projTiempos.map(t => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-700"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-200">{t.tarea}</p>
                          <span className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Técnico: {t.tecnico}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-blue-400">{t.horas} hrs</span>
                          <button
                            onClick={() => eliminarTiempo(t.id)}
                            className="text-slate-600 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
