import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { query } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

function generateSixDigitCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
}

async function getEmailSettings(): Promise<Record<string, string>> {
    const cfg: Record<string, string> = {};
    try {
        const res = await query('SELECT setting_key, setting_value FROM system_settings');
        for (const row of (res.rows as any[])) {
            cfg[row.setting_key] = row.setting_value;
        }
    } catch { /* ignore if table not ready */ }
    return cfg;
}

async function sendVerificationEmail(
    email: string,
    code: string,
    companyName: string
): Promise<{ delivered: boolean; provider?: string }> {
    const dbCfg = await getEmailSettings();
    const resendKey = process.env.RESEND_API_KEY || dbCfg.RESEND_API_KEY;
    const brevoKey = process.env.BREVO_API_KEY || dbCfg.BREVO_API_KEY;
    const smtpHost = process.env.SMTP_HOST || dbCfg.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || dbCfg.SMTP_PORT || 465);
    const smtpUser = process.env.SMTP_USER || dbCfg.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS || dbCfg.SMTP_PASS;
    const fromEmail = process.env.EMAIL_FROM || dbCfg.EMAIL_FROM || smtpUser || 'TrackPro GPS <no-reply@gps-eu.com>';

    const subject = `${code} est votre code de vérification TrackPro GPS`;
    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #09090b; color: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #27272a;">
            <div style="margin-bottom: 24px;">
                <span style="font-size: 20px; font-weight: 800; color: #ffffff;">TrackPro<span style="color: #3b82f6;">.</span></span>
                <span style="font-size: 11px; color: #a1a1aa; margin-left: 8px; letter-spacing: 1px;">EU FLEET</span>
            </div>
            <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #ffffff;">Vérifiez votre adresse email</h2>
            <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin: 0 0 24px;">
                Bonjour <strong style="color: #e4e4e7;">${companyName}</strong>,<br/>
                Utilisez le code de vérification à 6 chiffres ci-dessous pour activer votre compte de gestion de flotte GPS :
            </p>
            <div style="background: #18181b; border: 1px solid #3f3f46; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: monospace; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #60a5fa;">${code}</span>
            </div>
            <p style="font-size: 12px; color: #71717a; margin: 0;">
                Ce code est valable pendant <strong>10 minutes</strong>. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.
            </p>
        </div>
    `;

    // 1. Try SMTP (Direct Nodemailer first, then Vercel SMTP relay if Railway blocks port 465/587)
    if (smtpUser && smtpPass) {
        const effectiveHost = smtpHost || 'smtp.gmail.com';
        // 1a. Try Vercel HTTPS->SMTP relay first (never blocked by Railway firewall)
        try {
            const relayUrl = process.env.VERCEL_SMTP_RELAY_URL || 'https://www.gps-eu.com/api/send-otp';
            const relayResp = await fetch(relayUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email,
                    subject,
                    html,
                    smtpHost: effectiveHost,
                    smtpPort,
                    smtpUser,
                    smtpPass,
                }),
            });
            if (relayResp.ok) {
                return { delivered: true, provider: 'vercel-smtp' };
            }
            console.warn('[Auth] Vercel SMTP relay non-200:', await relayResp.text());
        } catch (relayErr) {
            console.warn('[Auth] Vercel SMTP relay error:', relayErr);
        }

        // 1b. Direct SMTP fallback
        try {
            const transporter = nodemailer.createTransport({
                host: effectiveHost,
                port: smtpPort,
                secure: smtpPort === 465,
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
            });
            await transporter.sendMail({
                from: fromEmail.includes('<') ? fromEmail : `"TrackPro GPS" <${smtpUser}>`,
                to: email,
                subject,
                html,
            });
            return { delivered: true, provider: 'smtp' };
        } catch (err) {
            console.warn('[Auth] SMTP email error:', err);
        }
    }

    // 2. Try Resend HTTP API if configured
    if (resendKey) {
        try {
            const resp = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: fromEmail.includes('<') ? fromEmail : 'TrackPro GPS <onboarding@resend.dev>',
                    to: [email],
                    subject,
                    html,
                }),
            });
            if (resp.ok) {
                return { delivered: true, provider: 'resend' };
            }
            console.warn('[Auth] Resend API returned non-200:', await resp.text());
        } catch (err) {
            console.warn('[Auth] Resend email error:', err);
        }
    }

    // 3. Try Brevo (Sendinblue) HTTP API if configured
    if (brevoKey) {
        try {
            const senderEmail = process.env.EMAIL_FROM_ADDRESS || dbCfg.EMAIL_FROM_ADDRESS || smtpUser || 'no-reply@gps-eu.com';
            const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'api-key': brevoKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sender: { name: 'TrackPro GPS', email: senderEmail },
                    to: [{ email }],
                    subject,
                    htmlContent: html,
                }),
            });
            if (resp.ok) {
                return { delivered: true, provider: 'brevo' };
            }
            console.warn('[Auth] Brevo API returned non-200:', await resp.text());
        } catch (err) {
            console.warn('[Auth] Brevo email error:', err);
        }
    }

    console.log(`[Auth OTP] Verification code for ${email} (${companyName}): ${code}`);
    return { delivered: false };
}

// STEP 1: SEND 6-DIGIT VERIFICATION CODE FOR SIGNUP
router.post('/register/send-code', async (req, res) => {
    const { email, password, companyName, phone } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanCompany = String(companyName || '').trim();
    const cleanPhone = phone ? String(phone).trim() : null;

    if (!cleanEmail || !password || !cleanCompany) {
        return res.status(400).json({ error: 'Veuillez remplir tous les champs obligatoires.' });
    }
    if (String(password).length < 6) {
        return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    try {
        // Check if user already exists
        const userCheck = await query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
        if ((userCheck.rows as any[]).length > 0) {
            return res.status(400).json({ error: 'Cette adresse email est déjà associée à un compte.' });
        }

        const hashedPassword = await bcrypt.hash(String(password), 10);
        const code = generateSixDigitCode();

        // Remove any previous pending verification for this email
        await query('DELETE FROM email_verifications WHERE email = ?', [cleanEmail]);

        // Save new verification code valid for 10 minutes
        await query(
            `INSERT INTO email_verifications (email, code, company_name, phone, password_hash, attempts, expires_at)
             VALUES (?, ?, ?, ?, ?, 0, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
            [cleanEmail, code, cleanCompany, cleanPhone, hashedPassword]
        );

        const mailResult = await sendVerificationEmail(cleanEmail, code, cleanCompany);

        return res.status(200).json({
            message: 'Verification code sent',
            email: cleanEmail,
            emailDelivered: mailResult.delivered,
        });
    } catch (err) {
        console.error('[Auth] send-code error:', err);
        return res.status(500).json({ error: "Impossible d'envoyer le code de vérification." });
    }
});

// STEP 2: VERIFY 6-DIGIT CODE & CREATE ACCOUNT
router.post('/register/verify-code', async (req, res) => {
    const { email, code } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanCode = String(code || '').trim();

    if (!cleanEmail || !cleanCode) {
        return res.status(400).json({ error: 'Email et code de vérification requis.' });
    }

    try {
        const verifRes = await query(
            `SELECT *, (expires_at < NOW()) AS is_expired
             FROM email_verifications
             WHERE email = ?
             ORDER BY id DESC LIMIT 1`,
            [cleanEmail]
        );
        const rows = verifRes.rows as any[];
        if (rows.length === 0) {
            return res.status(400).json({ error: 'Aucune demande de vérification trouvée pour cet email.' });
        }

        const record = rows[0];
        if (record.is_expired) {
            return res.status(400).json({ error: 'Le code a expiré. Veuillez demander un nouveau code.' });
        }
        if (record.attempts >= 5) {
            return res.status(400).json({ error: 'Trop de tentatives incorrectes. Veuillez renvoyer un nouveau code.' });
        }

        if (String(record.code) !== cleanCode) {
            await query('UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?', [record.id]);
            return res.status(400).json({ error: 'Code de vérification incorrect.' });
        }

        // Check again that user wasn't created in the meantime
        const userCheck = await query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
        if ((userCheck.rows as any[]).length > 0) {
            await query('DELETE FROM email_verifications WHERE email = ?', [cleanEmail]);
            return res.status(400).json({ error: 'Ce compte existe déjà.' });
        }

        const { userId, tenantId } = await import('../db').then(m => m.transaction(async (conn) => {
            const [tenantRes] = await conn.query<any>(
                'INSERT INTO tenants (name) VALUES (?)',
                [record.company_name]
            );
            const newTenantId = tenantRes.insertId;

            const [userRes] = await conn.query<any>(
                'INSERT INTO users (email, password_hash, phone, tenant_id, role) VALUES (?, ?, ?, ?, ?)',
                [cleanEmail, record.password_hash, record.phone || null, newTenantId, 'user']
            );
            await conn.query('DELETE FROM email_verifications WHERE email = ?', [cleanEmail]);
            return { userId: userRes.insertId, tenantId: newTenantId };
        }));

        const token = jwt.sign(
            { id: userId, email: cleanEmail, role: 'user', tenantId },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(201).json({
            message: 'Account verified and created',
            token,
            user: {
                id: userId,
                email: cleanEmail,
                role: 'user',
                companyName: record.company_name,
            },
        });
    } catch (err) {
        console.error('[Auth] verify-code error:', err);
        return res.status(500).json({ error: 'Erreur lors de la vérification du code.' });
    }
});

// RESEND 6-DIGIT VERIFICATION CODE
router.post('/register/resend-code', async (req, res) => {
    const { email } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanEmail) {
        return res.status(400).json({ error: 'Email requis.' });
    }

    try {
        const verifRes = await query(
            'SELECT * FROM email_verifications WHERE email = ? ORDER BY id DESC LIMIT 1',
            [cleanEmail]
        );
        const rows = verifRes.rows as any[];
        if (rows.length === 0) {
            return res.status(400).json({ error: 'Aucune inscription en attente pour cet email.' });
        }

        const record = rows[0];
        const newCode = generateSixDigitCode();

        await query(
            `UPDATE email_verifications
             SET code = ?, attempts = 0, expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE)
             WHERE id = ?`,
            [newCode, record.id]
        );

        const mailResult = await sendVerificationEmail(cleanEmail, newCode, record.company_name);

        return res.status(200).json({
            message: 'New verification code sent',
            email: cleanEmail,
            emailDelivered: mailResult.delivered,
        });
    } catch (err) {
        console.error('[Auth] resend-code error:', err);
        return res.status(500).json({ error: 'Impossible de renvoyer un nouveau code.' });
    }
});

// LEGACY REGISTER (Fallback)
router.post('/register', async (req, res) => {
    const { email, password, companyName } = req.body;

    try {
        // 1. Check if user exists
        const userCheck = await query('SELECT * FROM users WHERE email = ?', [email]);
        if ((userCheck.rows as any[]).length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // 2. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Create Tenant (Company)
        const { userId } = await import('../db').then(m => m.transaction(async (conn) => {
            const [tenantRes] = await conn.query<any>('INSERT INTO tenants (name) VALUES (?)', [companyName]);
            const tenantId = tenantRes.insertId;

            const [userRes] = await conn.query<any>(
                'INSERT INTO users (email, password_hash, tenant_id, role) VALUES (?, ?, ?, ?)',
                [email, hashedPassword, tenantId, 'user']
            );
            return { userId: userRes.insertId };
        }));

        res.status(201).json({ message: 'User registered', user: { id: userId, email, role: 'admin' } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await query('SELECT * FROM users WHERE email = ?', [email]);
        const rows = result.rows as any[];

        if (rows.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid password' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, tenantId: user.tenant_id }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ token, user: { id: user.id, email: user.email, role: user.role } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// GET USER PROFILE
router.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
    const userId = req.user.id;
    try {
        const result = await query(
            `SELECT u.id, u.email, u.phone, u.role, u.tenant_id, t.name AS company_name
             FROM users u
             LEFT JOIN tenants t ON u.tenant_id = t.id
             WHERE u.id = ?`,
            [userId]
        );
        const rows = result.rows as any[];
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur introuvable.' });
        }
        const u = rows[0];
        res.json({
            id: u.id,
            email: u.email,
            phone: u.phone || '',
            role: u.role,
            companyName: u.company_name || '',
        });
    } catch (err) {
        console.error('[Auth] Failed to fetch profile:', err);
        res.status(500).json({ error: 'Impossible de charger le profil.' });
    }
});

// CHANGE PASSWORD (with current password verification)
router.post('/change-password', authenticateToken, async (req: AuthRequest, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Veuillez renseigner le mot de passe actuel et le nouveau mot de passe.' });
    }
    if (String(newPassword).length < 6) {
        return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
    }

    try {
        const result = await query('SELECT id, password_hash FROM users WHERE id = ?', [userId]);
        const rows = result.rows as any[];
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur introuvable.' });
        }

        const user = rows[0];
        const isValid = await bcrypt.compare(String(currentPassword), user.password_hash);
        if (!isValid) {
            return res.status(400).json({ error: 'Le mot de passe actuel est incorrect.' });
        }

        const hashedPassword = await bcrypt.hash(String(newPassword), 10);
        await query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);

        res.json({ message: 'Mot de passe mis à jour avec succès.' });
    } catch (err) {
        console.error('[Auth] Failed to change password:', err);
        res.status(500).json({ error: 'Erreur lors du changement de mot de passe.' });
    }
});

// UPDATE USER PROFILE
router.put('/profile', authenticateToken, async (req: AuthRequest, res) => {
    const { password, currentPassword, companyName, phone } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    try {
        if (password) {
            if (String(password).length < 6) {
                return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
            }
            if (currentPassword) {
                const resUser = await query('SELECT password_hash FROM users WHERE id = ?', [userId]);
                const u = (resUser.rows as any[])[0];
                if (!u || !(await bcrypt.compare(String(currentPassword), u.password_hash))) {
                    return res.status(400).json({ error: 'Le mot de passe actuel est incorrect.' });
                }
            }
        }

        await import('../db').then(m => m.transaction(async (conn) => {
            // 1. Update Password if provided
            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);
            }

            // 2. Update Company Name if provided
            if (companyName) {
                await conn.query('UPDATE tenants SET name = ? WHERE id = ?', [companyName, tenantId]);
            }

            // 3. Update Phone if provided
            if (phone !== undefined) {
                await conn.query('UPDATE users SET phone = ? WHERE id = ?', [phone, userId]);
            }
        }));

        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

export default router;
