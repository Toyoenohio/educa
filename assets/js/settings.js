

// ============================================
// SETTINGS / CONFIGURATION
// ============================================
async function loadSettings() {
    try {
        const { data, error } = await supabaseClient
            .from('settings')
            .select('*');
        
        if (error) throw error;
        
        // Fill form fields with settings
        data.forEach(setting => {
            const input = document.getElementById(`setting-${setting.key.replace(/_/g, '-')}`);
            if (input) {
                input.value = setting.value;
            }
        });
        
    } catch (err) {
        console.error('Error loading settings:', err);
        showToast('Error cargando configuración', 'error');
    }
}

// Load and cache settings for student view
let cachedSettings = null;
async function getSettings() {
    if (cachedSettings) return cachedSettings;
    
    try {
        const { data, error } = await supabaseClient
            .from('settings')
            .select('*');
        
        if (error) throw error;
        
        cachedSettings = {};
        data.forEach(s => {
            cachedSettings[s.key] = s.value;
        });
        
        return cachedSettings;
    } catch (err) {
        console.error('Error fetching settings:', err);
        return {};
    }
}

// Handle settings form submission
document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updates = [];
    
    // Prepare updates
    for (const [key, value] of formData.entries()) {
        updates.push({
            key: key,
            value: value,
            updated_by: currentUser.id
        });
    }
    
    try {
        // Upsert settings (insert or update)
        const { error } = await supabaseClient
            .from('settings')
            .upsert(updates, { onConflict: 'key' });
        
        if (error) throw error;
        
        // Clear cache
        cachedSettings = null;
        
        showToast('✅ Configuración guardada exitosamente');
    } catch (err) {
        showToast('Error guardando configuración: ' + err.message, 'error');
    }
});
