-- Substitua 'seu_email@exemplo.com' pelo e-mail do usuário que você deseja tornar ADMIN
UPDATE nikeflow_users
SET role = 'ADMIN'
WHERE email = 'seu_email@exemplo.com';

-- Para conferir a alteração:
SELECT email, role FROM nikeflow_users WHERE email = 'seu_email@exemplo.com';
