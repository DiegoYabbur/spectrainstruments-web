const express = require('express');
const cors = require('cors');
const path = require('path'); 
const { createClient } = require('@supabase/supabase-js');

const app = express();

// 1. PUERTO DINÁMICO (Vital para Render)
const PORT = process.env.PORT || 3000;

// 2. VARIABLES DE ENTORNO
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bnyduhzduwznxxoixral.supabase.co'; 
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_CzOvnpcFG8ol2yWD-QQ7UQ__Eiohho4';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(cors());
app.use(express.json());

// 3. LA MAGIA WEB: Servir los archivos de la carpeta "public"
app.use(express.static(path.join(__dirname, 'public')));

// 4. RUTA DE SALUD 
app.get('/ping', (req, res) => {
    res.send('🚀 Servidor de Spectra Instruments Online y Operativo');
});

// 5. RECEPCIÓN DE TELEMETRÍA (Desde el ESP32)
app.post('/api/data', async (req, res) => {
    const data = req.body;
    console.log("📥 Recibido del hardware Spectra:", data);

    const { data: insertData, error } = await supabase
        .from('mediciones') 
        .insert([
            { 
                device_id: data.device_id || data.id, 
                viento_dir: data.viento_dir, 
                viento_vel: data.viento_vel,
                temp: data.temp,
                rh: data.rh,
                presion: data.presion,
                bat_v: data.bat_v
            }
        ])
        .select(); 

    if (error) {
        console.log("❌ ERROR DE SUPABASE:", error.message);
        return res.status(500).json({ status: "error", message: error.message });
    }

    console.log("✅ CONFIRMACIÓN DESDE LA NUBE:", insertData);
    res.status(201).json({ status: "success", db_response: insertData });
});

// 6. RUTA DE ACCESO A SPECTRACLOUD (LOGIN)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`🔐 Intento de acceso SpectraCloud para: ${email}`);

    // Autenticación nativa de Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        console.log("❌ Acceso denegado:", error.message);
        return res.status(401).json({ status: "error", message: "Credenciales inválidas." });
    }

    console.log("✅ Acceso concedido a:", email);
    res.status(200).json({ status: "success", session: data.session });
});

// 7. RUTA PARA ALIMENTAR EL DASHBOARD (MULTI-TENANT REAL)
app.get('/api/mediciones', async (req, res) => {
    const usuarioSolicitante = req.query.usuario;
    console.log(`📊 Dashboard solicitando telemetría para: ${usuarioSolicitante}`);

    if (!usuarioSolicitante) {
        return res.status(400).json({ status: "error", message: "Falta identificación de usuario." });
    }

    // PASO A: Consultamos la tabla 'estaciones'
    const { data: misEstaciones, error: errEstaciones } = await supabase
        .from('estaciones')
        .select('device_id')
        .eq('cliente_email', usuarioSolicitante);

    if (errEstaciones) {
        console.log("❌ Error leyendo estaciones:", errEstaciones.message);
        return res.status(500).json({ status: "error", message: errEstaciones.message });
    }

    // Validación de estaciones vacías
    if (!misEstaciones || misEstaciones.length === 0) {
        console.log(`⚠️ El usuario ${usuarioSolicitante} no tiene estaciones asignadas.`);
        return res.status(200).json([]); 
    }

    // Extracción de IDs permitidos
    const misNodosPermitidos = misEstaciones.map(est => est.device_id);
    console.log(`📡 Nodos autorizados:`, misNodosPermitidos);

    // PASO B: Traemos la telemetría histórica (Límite subido a 2000 para gráficos largos)
    const { data: telemetria, error: errTelemetria } = await supabase
        .from('mediciones')
        .select('*')
        .in('device_id', misNodosPermitidos)
        .order('created_at', { ascending: false })
        .limit(2000);

    if (errTelemetria) {
        console.log("❌ Error leyendo telemetría:", errTelemetria.message);
        return res.status(500).json({ status: "error", message: errTelemetria.message });
    }

    res.status(200).json(telemetria);
});

// 8. RUTA PARA GESTIÓN DE FLOTA (MIS NODOS)
app.get('/api/nodos', async (req, res) => {
    const usuarioSolicitante = req.query.usuario;
    console.log(`📡 Consultando flota de nodos para: ${usuarioSolicitante}`);

    if (!usuarioSolicitante) {
        return res.status(400).json({ status: "error", message: "Falta identificación de usuario." });
    }

    // Leemos la tabla 'estaciones' (la de tu captura)
    const { data, error } = await supabase
        .from('estaciones')
        .select('*')
        .eq('cliente_email', usuarioSolicitante);

    if (error) {
        console.log("❌ Error leyendo estaciones:", error.message);
        return res.status(500).json({ status: "error", message: error.message });
    }

    res.status(200).json(data);
});

// 9. RUTA DE EXPORTACIÓN MASIVA (Sin límites)
app.get('/api/exportar', async (req, res) => {
    const usuarioSolicitante = req.query.usuario;
    if (!usuarioSolicitante) return res.status(400).json({ error: "Falta usuario." });

    const { data: misEstaciones } = await supabase.from('estaciones').select('device_id').eq('cliente_email', usuarioSolicitante);
    if (!misEstaciones || misEstaciones.length === 0) return res.status(200).json([]);

    const misNodosPermitidos = misEstaciones.map(est => est.device_id);

    // Trae TODO el histórico, ideal para ZIPs
    const { data: telemetria, error } = await supabase
        .from('mediciones')
        .select('*')
        .in('device_id', misNodosPermitidos)
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json(telemetria);
});

// 10. PROTOCOLO DE BORRADO (ZONA PELIGROSA)
app.delete('/api/mediciones', async (req, res) => {
    const usuario = req.query.usuario;
    const device = req.query.device; // Puede ser un ID específico o "ALL"

    if (!usuario || !device) return res.status(400).json({ error: "Faltan parámetros de seguridad." });

    // Validar propiedad
    const { data: misEstaciones } = await supabase.from('estaciones').select('device_id').eq('cliente_email', usuario);
    const permitidos = misEstaciones.map(e => e.device_id);

    let query = supabase.from('mediciones').delete();

    if (device === 'ALL') {
        // Borrar todo lo de este usuario
        query = query.in('device_id', permitidos);
    } else {
        // Borrar solo un nodo, previa validación de que le pertenece
        if (!permitidos.includes(device)) return res.status(403).json({ error: "Nodo no autorizado." });
        query = query.eq('device_id', device);
    }

    const { error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ success: true, message: "Datos eliminados permanentemente." });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor SpectraCloud escuchando en puerto ${PORT}`);
});