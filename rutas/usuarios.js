// ...existing code...
const express = require('express');
const router = express.Router();
const User = require('../modelos/users');
const bcrypt = require('bcrypt'); // Asegúrate de instalar bcrypt: npm install bcrypt

// Endpoint de registro
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        // Verifica si el usuario o email ya existen
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Usuario o email ya registrados' });
        }
        // Hashea la contraseña antes de guardar
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });
        await newUser.save();
        // Omite la contraseña en la respuesta
        const { password: _, ...userData } = newUser.toObject();
        res.status(201).json({ message: 'Registro exitoso', user: userData });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
});

// ...existing code...

// Endpoint de login
router.post('/login', async (req, res) => {
    console.log(req.body);
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Contraseña incorrecta' });
        }
        // Puedes omitir la contraseña en la respuesta
        const { password: _, ...userData } = user.toObject();
        res.json({ message: 'Login exitoso', user: userData });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
});



module.exports = router;