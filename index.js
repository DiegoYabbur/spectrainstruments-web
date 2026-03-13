const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3000;

const SUPABASE_URL = 'https://bnyduhzduwznxxoixral.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_CzOvnpcFG8ol2yWD-QQ7UQ__Eiohho4';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(cors());
app.use(express.json());

app.post('/api/data', async (req, res) => {
    const data = req.body;
    console.log("📥 Recibido del cliente:", data);

    // Intentamos insertar
    const { data: insertData, error } = await supabase
        .from('mediciones') 
        .insert([
            { 
                device_id: data.id, 
                viento_dir: data.viento_dir, 
                viento_vel: data.viento_vel,
                temp: data.temp,
                rh: data.rh,
                presion: data.presion,
                bat_v: data.bat_v
            }
        ])
        .select(); // Esto fuerza a Supabase a confirmar el registro

    if (error) {
        console.log("❌ ERROR DE SUPABASE:", error.message);
        return res.status(500).json({ status: "error", message: error.message });
    }

    console.log("✅ CONFIRMACIÓN DESDE LA NUBE:", insertData);
    res.status(201).json({ status: "success", db_response: insertData });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor SpectraCloud escuchando en puerto ${PORT}`);
});