import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Thermometer, Wind, Battery, Droplets, Gauge, Compass, Download, Clock, Calendar, Table2, LogOut, Lock, ArrowLeft, Activity, MapPin, Server } from 'lucide-react';

// --- CONFIGURACIÓN DE SUPABASE ---
const supabase = createClient(
  'https://bnyduhzduwznxxoixral.supabase.co', 
  'sb_publishable_CzOvnpcFG8ol2yWD-QQ7UQ__Eiohho4'
);

// --- ESTILOS INYECTADOS ---
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Inter:wght@300;400;600&display=swap');
  
  body { background-color: #050505; color: #a1a1aa; font-family: 'Inter', sans-serif; margin: 0; min-height: 100vh; display: flex; flex-direction: column; }
  h1, h2, h3, .objex-title { font-family: 'Space Grotesk', sans-serif; color: #ffffff; letter-spacing: -0.5px; }
  
  .spectra-card { background: #0f0f0f; border: 1px solid #1f1f1f; border-radius: 2px; }
  
  .control-btn {
    background: #0f0f0f; border: 1px solid #27272a; color: #71717a; padding: 6px 12px;
    border-radius: 2px; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 0.85rem;
    transition: all 0.2s; display: flex; align-items: center; gap: 6px;
  }
  .control-btn:hover { border-color: #d97706; color: #d97706; }
  
  .metric-btn {
    background: transparent; border: none; border-bottom: 2px solid transparent; color: #71717a;
    padding: 8px 0; margin-right: 20px; cursor: pointer; font-family: 'Space Grotesk', sans-serif;
    font-weight: 600; transition: all 0.2s;
  }
  .metric-btn.active { border-bottom-color: #d97706; color: #ffffff; }

  select.spectra-select, input.spectra-input {
    background: #0f0f0f; border: 1px solid #27272a; color: #a1a1aa; padding: 6px 10px;
    border-radius: 2px; outline: none; font-family: 'Inter', sans-serif;
  }
  input.spectra-input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: 0.5; cursor: pointer; }

  .spectra-table-container { overflow-x: auto; margin-top: 20px; }
  .spectra-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; }
  .spectra-table th { background: #1a1a1a; color: #d97706; padding: 12px; font-family: 'Space Grotesk', sans-serif; border-bottom: 1px solid #27272a; white-space: nowrap; }
  .spectra-table td { padding: 12px; border-bottom: 1px solid #1f1f1f; color: #e4e4e7; white-space: nowrap; }
  .spectra-table tr:hover { background: #121212; }

  /* ESTILOS DE LOGIN */
  .login-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-image: radial-gradient(circle at center, #111 0%, #050505 100%); }
  .login-box { background: #0a0a0a; padding: 40px; border: 1px solid #1f1f1f; border-top: 3px solid #d97706; width: 100%; max-width: 400px; text-align: center; }
  .login-input { width: 100%; background: #050505; border: 1px solid #27272a; color: #fff; padding: 12px; margin-bottom: 15px; box-sizing: border-box; font-family: 'Inter', sans-serif; }
  .login-input:focus { border-color: #d97706; outline: none; }
  .login-btn { width: 100%; background: #d97706; color: #000; border: none; padding: 12px; font-family: 'Space Grotesk', sans-serif; font-weight: bold; font-size: 1rem; cursor: pointer; transition: background 0.2s; }
  .login-btn:hover { background: #f59e0b; }

  /* ESTILOS DE TARJETAS DE FLOTA (HUB) */
  .fleet-card {
    background: #0a0a0a; border: 1px solid #1f1f1f; padding: 25px; border-radius: 4px;
    cursor: pointer; transition: all 0.3s ease; position: relative; overflow: hidden;
  }
  .fleet-card:hover { border-color: #d97706; transform: translateY(-3px); box-shadow: 0 10px 30px -10px rgba(217, 119, 6, 0.15); }
  .fleet-card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #27272a; transition: background 0.3s; }
  .fleet-card:hover::before { background: #d97706; }

  /* FOOTER */
  .spectra-footer {
    margin-top: auto; padding: 30px 5%; border-top: 1px solid #1f1f1f; background: #0a0a0a;
    display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: #52525b;
  }
`;

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);

  // CONTROL DE VISTAS (NUEVO)
  const [currentView, setCurrentView] = useState('hub'); // 'hub' | 'dashboard'
  
  const [estaciones, setEstaciones] = useState([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [rawData, setRawData] = useState([]);
  const [chartData, setChartData] = useState([]);
  
  const [timeRange, setTimeRange] = useState('24h'); 
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [interval, setInterval] = useState('raw'); 
  const [activeMetrics, setActiveMetrics] = useState({ temp: true, rh: false, presion: false, viento_vel: false, viento_dir: false, bat_v: false });

  const METRICS_CONFIG = {
    temp: { name: 'Temp (°C)', color: '#ef4444' }, rh: { name: 'Humedad (%)', color: '#3b82f6' },
    presion: { name: 'Presión (hPa)', color: '#a855f7' }, viento_vel: { name: 'Viento (km/h)', color: '#10b981' },
    viento_dir: { name: 'Dir. Viento (°)', color: '#64748b' }, bat_v: { name: 'Batería (V)', color: '#d97706' }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchEstaciones(session.user.email);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchEstaciones(session.user.email);
    });
  }, []);

  const fetchEstaciones = async (userEmail) => {
    const { data } = await supabase.from('estaciones').select('*').eq('cliente_email', userEmail);
    if (data) setEstaciones(data);
  };

  useEffect(() => {
    if (currentView === 'dashboard' && selectedStation && (timeRange !== 'custom' || (timeRange === 'custom' && customStart && customEnd))) {
      fetchData();
    }
  }, [currentView, selectedStation, timeRange, customStart, customEnd]);

  useEffect(() => {
    if (currentView !== 'dashboard' || !selectedStation) return;
    const subscription = supabase
      .channel('cambios-mediciones')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mediciones' }, payload => {
        if (payload.new.device_id === selectedStation) {
          setRawData(prev => [payload.new, ...prev]);
        }
      }).subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, [currentView, selectedStation]);

  useEffect(() => { setChartData(processData(rawData, interval)); }, [rawData, interval]);

  const fetchData = async () => {
    let query = supabase.from('mediciones').select('*').eq('device_id', selectedStation).order('created_at', { ascending: false });
    if (timeRange === 'custom' && customStart && customEnd) {
      query = query.gte('created_at', `${customStart}T00:00:00.000Z`).lte('created_at', `${customEnd}T23:59:59.999Z`);
    } else if (timeRange !== 'all' && timeRange !== 'custom') {
      const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 24*7 : 24*30;
      query = query.gte('created_at', new Date(new Date().getTime() - (hours * 60 * 60 * 1000)).toISOString());
    } else if (timeRange === 'all') {
      query = query.limit(2000); 
    }
    const { data } = await query;
    setRawData(data || []);
  };

  const processData = (data, currInterval) => {
    if (currInterval === 'raw' || !data.length) return [...data].reverse();
    const grouped = {};
    data.forEach(item => {
      let coeff = currInterval === '30m' ? 1000 * 60 * 30 : 1000 * 60 * 60;
      const key = new Date(Math.floor(new Date(item.created_at).getTime() / coeff) * coeff).toISOString();
      if (!grouped[key]) grouped[key] = { count: 0, temp: 0, rh: 0, presion: 0, viento_vel: 0, viento_dir: 0, bat_v: 0, created_at: key };
      grouped[key].count++;
      Object.keys(METRICS_CONFIG).forEach(m => { grouped[key][m] += (item[m] || 0); });
    });
    return Object.values(grouped).map(g => {
      const avgData = { created_at: g.created_at, isAvg: true };
      Object.keys(METRICS_CONFIG).forEach(m => { avgData[m] = Number((g[m] / g.count).toFixed(1)); });
      return avgData;
    }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoadingLogin(true);
    setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginError('Credenciales incorrectas.');
    setLoadingLogin(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setEstaciones([]); setRawData([]); setCurrentView('hub');
  };

  const openStation = (deviceId) => {
    setSelectedStation(deviceId);
    setCurrentView('dashboard');
  };

  const downloadCSV = () => {
    const headers = ['Fecha_Hora', ...Object.values(METRICS_CONFIG).map(m => m.name)];
    const rows = chartData.map(d => [ new Date(d.created_at).toLocaleString(), d.temp, d.rh, d.presion, d.viento_vel, d.viento_dir, d.bat_v ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `Spectra_${selectedStation}_${new Date().toISOString().slice(0,10)}.csv`; link.click();
  };

  const toggleMetric = (metric) => setActiveMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
  const formatXAxis = (tickItem) => {
    const date = new Date(tickItem);
    return `${date.getDate()}/${date.getMonth()+1} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // --- COMPONENTE FOOTER ---
  const SpectraFooter = () => (
    <footer className="spectra-footer">
      <div>
        <span style={{ color: '#d97706', fontWeight: 'bold', fontFamily: 'Space Grotesk' }}>SPECTRA INSTRUMENTS SpA</span>
        <span style={{ marginLeft: '10px' }}>© {new Date().getFullYear()} - Plataforma de Monitoreo IoT</span>
      </div>
      <div style={{ display: 'flex', gap: '20px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Server size={14}/> La Serena, Chile</span>
        <span>Soporte Técnico</span>
      </div>
    </footer>
  );

  if (!session) {
    return (
      <>
        <style>{globalStyles}</style>
        <div className="login-container">
          <div className="login-box">
            <Lock size={40} color="#d97706" style={{ marginBottom: '20px' }} />
            <h1 style={{ fontSize: '1.8rem', margin: '0 0 5px 0' }}>SPECTRA NÚCLEO IOT</h1>
            <p style={{ color: '#71717a', fontSize: '0.9rem', marginBottom: '30px' }}>ACCESO RESTRINGIDO - TELEMETRÍA</p>
            <form onSubmit={handleLogin}>
              <input type="email" placeholder="Correo Electrónico" className="login-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" placeholder="Contraseña" className="login-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
              {loginError && <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'left', marginTop: '0', marginBottom: '15px' }}>{loginError}</p>}
              <button type="submit" className="login-btn" disabled={loadingLogin}>{loadingLogin ? 'VERIFICANDO...' : 'INICIAR SESIÓN'}</button>
            </form>
          </div>
        </div>
      </>
    );
  }

  // --- VISTA 1: HUB DE ESTACIONES ---
  if (currentView === 'hub') {
    return (
      <>
        <style>{globalStyles}</style>
        <div style={{ padding: '40px 5%', maxWidth: '1400px', margin: '0 auto', flex: 1, width: '100%', boxSizing: 'border-box' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px', borderBottom: '1px solid #1f1f1f', paddingBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '2.5rem', margin: 0 }}>PANEL DE CONTROL</h1>
              <p style={{ color: '#71717a', margin: '5px 0 0 0' }}>Gestión de hardware desplegado</p>
            </div>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#71717a' }}>{session.user.email}</span>
              <button onClick={handleLogout} className="control-btn" style={{ border: '1px solid #ef4444', color: '#ef4444' }}>
                <LogOut size={16} /> SALIR
              </button>
            </div>
          </header>

          <h3 style={{ color: '#d97706', marginBottom: '20px', fontSize: '1.1rem' }}>FLOTA DE SENSORES ACTIVOS ({estaciones.length})</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {estaciones.length === 0 ? (
              <p style={{ color: '#71717a' }}>No hay hardware asignado a esta cuenta.</p>
            ) : (
              estaciones.map(est => (
                <div key={est.device_id} className="fleet-card" onClick={() => openStation(est.device_id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <Activity color="#d97706" size={28} />
                    <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>ONLINE</span>
                  </div>
                  <h2 style={{ fontSize: '1.4rem', margin: '0 0 5px 0' }}>{est.nombre}</h2>
                  <p style={{ color: '#71717a', fontSize: '0.85rem', margin: '0 0 15px 0', fontFamily: 'Space Grotesk' }}>ID: {est.device_id}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#52525b', fontSize: '0.85rem' }}>
                    <MapPin size={14} /> {est.ubicacion || 'Ubicación no especificada'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <SpectraFooter />
      </>
    );
  }

  // --- VISTA 2: DASHBOARD (TELEMETRÍA) ---
  const latest = rawData[0] || {};
  const currentStationInfo = estaciones.find(e => e.device_id === selectedStation) || {};

  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ padding: '40px 5%', maxWidth: '1600px', margin: '0 auto', flex: 1, width: '100%', boxSizing: 'border-box' }}>
        
        <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <button onClick={() => setCurrentView('hub')} className="control-btn" style={{ marginBottom: '15px', padding: '6px 12px', background: 'transparent', border: 'none' }}>
              <ArrowLeft size={16} /> VOLVER A LA FLOTA
            </button>
            <h1 style={{ fontSize: '2.5rem', margin: '0 0 10px 0', lineHeight: '1' }}>{currentStationInfo.nombre || 'ESTACIÓN'}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '0.95rem', color: '#d97706', fontFamily: 'Space Grotesk' }}>ID: {selectedStation}</span>
              {currentStationInfo.ubicacion && <span style={{ fontSize: '0.85rem', color: '#71717a', background: '#111', padding: '4px 8px', borderRadius: '4px' }}>📍 {currentStationInfo.ubicacion}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button onClick={downloadCSV} className="control-btn" style={{ backgroundColor: '#1a1a1a' }}><Download size={16} /> EXPORTAR CSV</button>
          </div>
        </header>

        {/* Tarjetas, Gráfico y Tabla (Igual que antes) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
          <StatCard icon={<Thermometer/>} label="TEMPERATURA" value={`${latest.temp || '--'} °C`} />
          <StatCard icon={<Droplets/>} label="HUMEDAD" value={`${latest.rh || '--'} %`} />
          <StatCard icon={<Gauge/>} label="PRESIÓN" value={`${latest.presion || '--'} hPa`} />
          <StatCard icon={<Wind/>} label="VIENTO VEL." value={`${latest.viento_vel || '--'} km/h`} />
          <StatCard icon={<Compass/>} label="VIENTO DIR." value={`${latest.viento_dir || '--'} °`} />
          <StatCard icon={<Battery color="#d97706"/>} label="BATERÍA" value={`${latest.bat_v || '--'} V`} accent />
        </div>

        {/* GRÁFICO */}
        <div className="spectra-card" style={{ padding: '30px', marginBottom: '20px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', marginBottom: '30px', borderBottom: '1px solid #1f1f1f', paddingBottom: '15px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {Object.keys(METRICS_CONFIG).map(key => (
                <button key={key} className={`metric-btn ${activeMetrics[key] ? 'active' : ''}`} onClick={() => toggleMetric(key)}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: activeMetrics[key] ? METRICS_CONFIG[key].color : 'transparent', border: `1px solid ${METRICS_CONFIG[key].color}`, marginRight: '6px' }}></span>
                  {METRICS_CONFIG[key].name}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#0a0a0a', padding: '4px', borderRadius: '4px', border: '1px solid #1f1f1f' }}>
                <Calendar size={14} color="#71717a" style={{ marginLeft: '5px' }}/>
                <select className="spectra-select" value={timeRange} onChange={(e) => setTimeRange(e.target.value)} style={{ border: 'none', background: 'transparent' }}>
                  <option value="24h">Últimas 24 Hrs</option>
                  <option value="7d">Últimos 7 Días</option>
                  <option value="30d">Últimos 30 Días</option>
                  <option value="all">Todo el Histórico</option>
                  <option value="custom">Personalizado...</option>
                </select>
              </div>

              {timeRange === 'custom' && (
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <input type="date" className="spectra-input" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                  <span style={{color: '#71717a'}}>-</span>
                  <input type="date" className="spectra-input" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#0a0a0a', padding: '4px', borderRadius: '4px', border: '1px solid #1f1f1f' }}>
                <Clock size={14} color="#71717a" style={{ marginLeft: '5px' }}/>
                <select className="spectra-select" value={interval} onChange={(e) => setInterval(e.target.value)} style={{ border: 'none', background: 'transparent' }}>
                  <option value="raw">Crudo (Tiempo Real)</option>
                  <option value="30m">Promedio 30 Min</option>
                  <option value="1h">Promedio 1 Hora</option>
                </select>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#1a1a1a" vertical={false} />
              <XAxis dataKey="created_at" stroke="#52525b" tickFormatter={formatXAxis} tick={{fontSize: 12, fill: '#71717a'}} minTickGap={30} />
              <YAxis stroke="#52525b" tick={{fontSize: 12, fill: '#71717a'}} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #27272a', borderRadius: '2px' }} labelFormatter={(label) => new Date(label).toLocaleString()} />
              {Object.keys(METRICS_CONFIG).map(key => (
                activeMetrics[key] && <Line key={key} type="monotone" dataKey={key} name={METRICS_CONFIG[key].name} stroke={METRICS_CONFIG[key].color} strokeWidth={2} dot={interval === 'raw' ? { r: 2, fill: '#0a0a0a', strokeWidth: 1 } : { r: 4, fill: METRICS_CONFIG[key].color }} activeDot={{ r: 6, fill: '#ffffff' }} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* TABLA DE DATOS */}
        <div className="spectra-card" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Table2 color="#d97706" size={24}/>
            <h2 style={{ margin: 0 }}>REGISTRO TABULAR</h2>
            <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#71717a' }}>Mostrando {chartData.length} registros</span>
          </div>
          
          <div className="spectra-table-container">
            <table className="spectra-table">
              <thead>
                <tr>
                  <th>FECHA Y HORA</th>
                  <th>TEMP (°C)</th>
                  <th>HUMEDAD (%)</th>
                  <th>PRESIÓN (hPa)</th>
                  <th>VEL. VIENTO (km/h)</th>
                  <th>DIR. VIENTO (°)</th>
                  <th>BATERÍA (V)</th>
                </tr>
              </thead>
              <tbody>
                {[...chartData].reverse().map((row, index) => (
                  <tr key={index}>
                    <td style={{ color: '#d97706' }}>{new Date(row.created_at).toLocaleString()} {row.isAvg && '(Promedio)'}</td>
                    <td>{row.temp}</td>
                    <td>{row.rh}</td>
                    <td>{row.presion}</td>
                    <td>{row.viento_vel}</td>
                    <td>{row.viento_dir}</td>
                    <td style={{ color: row.bat_v < 3.5 ? '#ef4444' : '#e4e4e7' }}>{row.bat_v}</td>
                  </tr>
                ))}
                {chartData.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', color: '#71717a', padding: '30px' }}>No hay datos para esta estación.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      <SpectraFooter />
    </>
  );
}

const StatCard = ({ icon, label, value, accent }) => (
  <div className="spectra-card" style={{ padding: '20px', borderTop: accent ? '2px solid #d97706' : '1px solid #1f1f1f' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: '#71717a' }}>
      {React.cloneElement(icon, { size: 18 })}
      <span style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '1px' }}>{label}</span>
    </div>
    <div className="objex-title" style={{ fontSize: '1.8rem' }}>{value}</div>
  </div>
);

export default App;