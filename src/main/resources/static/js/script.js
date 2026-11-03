(function () {
    'use strict';

    const USERS_KEY = 'astracafe_users';
    const CURRENT_USER_KEY = 'astracafe_current_user';
    const CART_KEY = 'astracafe_cart';
    const AUTH_KEY = 'usuarioAutenticado';

    function hashPassword(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return String(hash >>> 0);
    }

    const DEFAULT_USER = {
        id: 1,
        nome: 'Maria',
        sobrenome: 'Silva',
        nomeCompleto: 'Maria Silva',
        email: 'maria@example.com',
        senha: hashPassword('123456'),
        role: 'cliente',
        perfil: {
            telefone: '(11) 99999-0000',
            dataNascimento: '1990-05-15'
        },
        enderecos: [{
            id: 1,
            titulo: 'Casa',
            endereco: 'Rua das Flores, 123',
            complemento: 'Apto 501 - Centro',
            cidade: 'São Paulo',
            estado: 'SP',
            cep: '01234-567',
            principal: true
        }],
        pedidos: [{
            id: 2024001,
            status: 'entregue',
            data: '24 de Setembro, 2024',
            subtotal: 31.5,
            entrega: 5,
            total: 36.5,
            items: [
                { nome: 'Cappuccino Premium', preco: 12, qtd: 2, quantidade: 2 },
                { nome: 'Croissant de Chocolate', preco: 7.5, qtd: 1, quantidade: 1 }
            ]
        }, {
            id: 2024002,
            status: 'enviado',
            data: '22 de Setembro, 2024',
            subtotal: 39,
            entrega: 0,
            total: 39,
            items: [
                { nome: 'Café Gelado Gourmet', preco: 13, qtd: 3, quantidade: 3 }
            ]
        }],
        compras: [],
        gastoTotal: 75.5
    };

    const DEFAULT_MANAGER = {
        id: 2,
        nome: 'Gerente',
        sobrenome: 'Sistema',
        nomeCompleto: 'Gerente Sistema',
        email: 'gerente@astracafe.com',
        senha: hashPassword('123456'),
        role: 'gerente',
        perfil: {
            telefone: '(11) 98888-7788',
            dataNascimento: '1988-07-20'
        },
        enderecos: [{
            id: 1,
            titulo: 'Loja',
            endereco: 'Av. Café Central, 150',
            complemento: 'Sala 02',
            cidade: 'São Paulo',
            estado: 'SP',
            cep: '01000-000',
            principal: true
        }],
        pedidos: [],
        compras: [],
        gastoTotal: 0
    };

    function isManagerUser(user) {
        if (!user) return false;
        const email = String(user.email || '').toLowerCase();
        return user.role === 'gerente' || email === 'gerente@astracafe.com' || email === 'admin@astracafe.com';
    }

    function matchesPassword(inputPassword, storedPassword) {
        const typed = String(inputPassword || '');
        const stored = String(storedPassword || '');
        return typed && (stored === typed || hashPassword(typed) === stored || stored === hashPassword(typed));
    }

    function getUsers() {
        try {
            return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        } catch (error) {
            return [];
        }
    }

    function saveUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    function normalizeLegacyUsers(users) {
        return users.map(user => {
            if (!user || !user.email) return user;

            const email = user.email.toLowerCase();
            const normalizedEmail = email === 'maria@astracafe.com' ? 'maria@example.com' : email;
            const inferredRole = normalizedEmail === 'gerente@astracafe.com' ? 'gerente' : 'cliente';

            if (normalizedEmail === 'maria@example.com' && user.senha !== hashPassword('123456')) {
                return {
                    ...user,
                    email: normalizedEmail,
                    nome: 'Maria',
                    sobrenome: 'Silva',
                    nomeCompleto: 'Maria Silva',
                    senha: hashPassword('123456'),
                    role: user.role || 'cliente',
                    perfil: {
                        telefone: '(11) 99999-0000',
                        dataNascimento: '1990-05-15',
                        ...(user.perfil || {})
                    },
                    enderecos: Array.isArray(user.enderecos) && user.enderecos.length ? user.enderecos : [{
                        id: 1,
                        titulo: 'Casa',
                        endereco: 'Rua das Flores, 123',
                        complemento: 'Apto 501 - Centro',
                        cidade: 'São Paulo',
                        estado: 'SP',
                        cep: '01234-567',
                        principal: true
                    }],
                    pedidos: Array.isArray(user.pedidos) ? user.pedidos : [],
                    compras: Array.isArray(user.compras) ? user.compras : [],
                    gastoTotal: Number(user.gastoTotal || 0)
                };
            }

            return {
                ...user,
                email: normalizedEmail,
                nome: user.nome || 'Maria',
                sobrenome: user.sobrenome || 'Silva',
                nomeCompleto: user.nomeCompleto || `${user.nome || 'Maria'} ${user.sobrenome || 'Silva'}`.trim(),
                senha: user.senha || hashPassword('123456'),
                role: user.role || inferredRole
            };
        });
    }

    function seedDefaultUser() {
        const users = normalizeLegacyUsers(getUsers());

        const hasMariaUser = users.some(user => user && user.email && user.email.toLowerCase() === 'maria@example.com');
        if (!hasMariaUser) {
            users.push(DEFAULT_USER);
        }

        const hasManagerUser = users.some(user => isManagerUser(user));
        if (!hasManagerUser) {
            users.push(DEFAULT_MANAGER);
        }

        saveUsers(users);
    }

    class AuthSystem {
        constructor() {
            this.users = this.loadUsers();
        }

        loadUsers() {
            try {
                const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
                return Array.isArray(users) ? users : [];
            } catch (error) {
                return [];
            }
        }

        saveUsers() {
            localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
        }

        register(nome, sobrenome, email, senha, role = 'cliente', accessCode = '') {
            this.users = this.loadUsers();
            const emailNormalizado = String(email || '').trim().toLowerCase();
            const nomeTrim = String(nome || '').trim();
            const sobrenomeTrim = String(sobrenome || '').trim();
            const selectedRole = role === 'gerente' ? 'gerente' : 'cliente';

            if (!nomeTrim || !sobrenomeTrim || !emailNormalizado || !senha) {
                return { success: false, message: 'Preencha todos os campos.' };
            }

            if (senha.length < 6) {
                return { success: false, message: 'A senha deve ter pelo menos 6 caracteres.' };
            }

            if (selectedRole === 'gerente' && String(accessCode || '').trim() !== 'ASTROCAFEGERENTE2024') {
                return { success: false, message: 'Código de gerente inválido.' };
            }

            if (this.users.some(user => user.email && user.email.toLowerCase() === emailNormalizado)) {
                return { success: false, message: 'Este email já está cadastrado.' };
            }

            const novoUsuario = {
                id: Date.now(),
                nome: nomeTrim,
                sobrenome: sobrenomeTrim,
                nomeCompleto: `${nomeTrim} ${sobrenomeTrim}`,
                email: emailNormalizado,
                senha: hashPassword(senha),
                role: selectedRole,
                perfil: { telefone: '', dataNascimento: '' },
                enderecos: [{
                    id: 1,
                    titulo: 'Casa',
                    endereco: 'Rua das Flores, 123',
                    complemento: 'Apto 501 - Centro',
                    cidade: 'São Paulo',
                    estado: 'SP',
                    cep: '01234-567',
                    principal: true
                }],
                pedidos: [],
                compras: [],
                gastoTotal: 0
            };

            this.users.push(novoUsuario);
            this.saveUsers();
            return { success: true, message: 'Conta criada com sucesso!', user: novoUsuario };
        }

        login(email, senha, selectedRole = 'cliente') {
            this.users = this.loadUsers();
            const emailNormalizado = String(email || '').trim().toLowerCase();
            const desiredRole = selectedRole === 'gerente' ? 'gerente' : 'cliente';

            if (!emailNormalizado || !senha) {
                return { success: false, message: 'Preencha email e senha.' };
            }

            const usuario = this.users.find(u => {
                if (!u.email || u.email.toLowerCase() !== emailNormalizado) return false;
                const userRole = u.role || 'cliente';
                return userRole === desiredRole;
            });

            if (!usuario) {
                return { success: false, message: 'Email, senha ou tipo de acesso incorretos!' };
            }

            const senhaValida = matchesPassword(senha, usuario.senha);
            if (!senhaValida) {
                return { success: false, message: 'Email, senha ou tipo de acesso incorretos!' };
            }

            const safeUser = { ...usuario, role: usuario.role || 'cliente' };
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(safeUser));
            localStorage.setItem(AUTH_KEY, 'true');
            return { success: true, message: 'Login realizado com sucesso!', user: safeUser };
        }

        getCurrentUser() {
            try {
                const raw = localStorage.getItem(CURRENT_USER_KEY);
                return raw ? JSON.parse(raw) : null;
            } catch (error) {
                return null;
            }
        }

        updateCurrentUser(updates) {
            const currentUser = this.getCurrentUser();
            if (!currentUser) return false;

            this.users = this.loadUsers();
            const index = this.users.findIndex(user => user.id === currentUser.id);
            if (index === -1) return false;

            const updatedUser = { ...this.users[index], ...updates };
            this.users[index] = updatedUser;
            this.saveUsers();
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
            return true;
        }

        logout() {
            localStorage.removeItem(CURRENT_USER_KEY);
            localStorage.removeItem(AUTH_KEY);
        }

        isAuthenticated() {
            return localStorage.getItem(AUTH_KEY) === 'true' && !!this.getCurrentUser();
        }
    }

    const auth = new AuthSystem();

    function formatMoney(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(Number(value || 0));
    }

    function parseCurrency(value) {
        if (!value) return 0;
        const cleaned = String(value)
            .replace(/R\$\s*/gi, '')
            .replace(/\./g, '')
            .replace(',', '.')
            .replace(/[^\d.-]/g, '');
        const parsed = Number(cleaned || 0);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function getCart() {
        try {
            return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        } catch (error) {
            return [];
        }
    }

    function saveCart(items) {
        localStorage.setItem(CART_KEY, JSON.stringify(items));
    }

    function getCartCount() {
        return getCart().reduce((sum, item) => sum + Number(item.quantidade || 0), 0);
    }

    function updateCartBadge() {
        const badge = document.getElementById('cartCount');
        if (badge) badge.textContent = String(getCartCount());
    }

    function addToCart(productName, productPrice) {
        const cart = getCart();
        const nome = String(productName || '').trim();
        if (!nome) return;

        const itemExists = cart.find(item => item.nome === nome);
        if (itemExists) {
            itemExists.quantidade += 1;
        } else {
            cart.push({
                id: nome.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                nome,
                preco: Number(productPrice || 0),
                quantidade: 1
            });
        }

        saveCart(cart);
        renderCart();
    }

    function updateCartItem(itemId, change) {
        const cart = getCart();
        const item = cart.find(product => product.id === itemId);
        if (!item) return;

        item.quantidade += change;
        if (item.quantidade <= 0) {
            saveCart(cart.filter(product => product.id !== itemId));
        } else {
            saveCart(cart);
        }

        renderCart();
    }

    function removeCartItem(itemId) {
        const cart = getCart();
        saveCart(cart.filter(item => item.id !== itemId));
        renderCart();
    }

    function renderCart() {
        const cart = getCart();
        const cartItems = document.getElementById('cartItems');
        const subtotalEl = document.getElementById('cartSubtotal');
        const taxaEl = document.getElementById('cartTaxa');
        const totalEl = document.getElementById('cartTotal');

        if (!cartItems || !subtotalEl || !taxaEl || !totalEl) return;

        updateCartBadge();
        if (!cart.length) {
            cartItems.innerHTML = `
                <div class="carrinho-vazio">
                    <i class="fas fa-shopping-bag"></i>
                    <p>Seu carrinho está vazio</p>
                </div>
            `;
            subtotalEl.textContent = formatMoney(0);
            taxaEl.textContent = formatMoney(0);
            totalEl.textContent = formatMoney(0);
            return;
        }

        const subtotal = cart.reduce((sum, item) => sum + Number(item.preco || 0) * Number(item.quantidade || 0), 0);
        const taxa = subtotal * 0.10;
        const total = subtotal + taxa;

        cartItems.innerHTML = cart.map(item => `
            <div class="carrinho-item" data-id="${item.id}">
                <div class="item-info">
                    <h6>${item.nome}</h6>
                    <p>${formatMoney(item.preco)} cada</p>
                </div>
                <div class="item-qty">
                    <button class="qty-btn btn-qty-minus" data-id="${item.id}" aria-label="Diminuir quantidade">-</button>
                    <span class="qty-valor">${item.quantidade}</span>
                    <button class="qty-btn btn-qty-plus" data-id="${item.id}" aria-label="Aumentar quantidade">+</button>
                </div>
                <div class="item-subtotal">
                    <p>${formatMoney(item.preco * item.quantidade)}</p>
                    <button class="btn-remove-item" data-id="${item.id}" aria-label="Remover item">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        subtotalEl.textContent = formatMoney(subtotal);
        taxaEl.textContent = formatMoney(taxa);
        totalEl.textContent = formatMoney(total);
    }

    function showToast(message, type = 'success') {
        const toastBox = document.getElementById('toastBox') || document.createElement('div');
        if (!document.getElementById('toastBox')) {
            toastBox.id = 'toastBox';
            toastBox.style.cssText = 'position:fixed;right:20px;bottom:20px;display:flex;flex-direction:column;gap:10px;z-index:2000;';
            document.body.appendChild(toastBox);
        }

        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `padding:12px 18px;border-radius:12px;background:${type === 'success' ? '#2d6a4f' : '#1d3557'};color:#fff;box-shadow:0 8px 20px rgba(0,0,0,.18);font-weight:600;`;
        toastBox.appendChild(toast);
        setTimeout(() => toast.remove(), 1800);
    }

    function setupCartUI() {
        const cartButton = document.getElementById('btnCarrinho');
        const cartContainer = document.getElementById('carrinhoContainer');
        const closeCart = document.getElementById('closeCarrinho');
        const checkoutButton = document.getElementById('checkoutButton');

        if (cartButton && cartContainer) {
            cartButton.addEventListener('click', () => cartContainer.classList.add('ativo'));
        }

        if (closeCart && cartContainer) {
            closeCart.addEventListener('click', () => cartContainer.classList.remove('ativo'));
        }

        if (cartContainer) {
            cartContainer.addEventListener('click', event => {
                if (event.target === cartContainer) cartContainer.classList.remove('ativo');
            });
        }

        if (checkoutButton) {
            checkoutButton.addEventListener('click', () => {
                const cart = getCart();
                if (!cart.length) {
                    alert('Seu carrinho está vazio.');
                    return;
                }

                const atendimento = document.getElementById('pedidoTipoAtendimento')?.value || 'balcao';
                const usuario = auth.getCurrentUser();

                if (!usuario) {
                    alert('É necessário estar autenticado e cadastrado para finalizar qualquer pedido.');
                    window.location.href = 'login.html';
                    return;
                }

                if (!atendimento) {
                    alert('Selecione o tipo de atendimento do pedido.');
                    return;
                }

                const subtotal = cart.reduce((sum, item) => sum + Number(item.preco || 0) * Number(item.quantidade || 0), 0);
                const taxa = subtotal * 0.10;
                const total = subtotal + taxa;
                const pedido = {
                    id: Date.now(),
                    status: 'pendente',
                    data: new Date().toLocaleDateString('pt-BR'),
                    subtotal,
                    entrega: taxa,
                    total,
                    tipoAtendimento: atendimento,
                    items: cart.map(item => ({
                        nome: item.nome,
                        preco: Number(item.preco || 0),
                        qtd: Number(item.quantidade || 1),
                        quantidade: Number(item.quantidade || 1)
                    }))
                };

                auth.updateCurrentUser({
                    pedidos: [pedido, ...(Array.isArray(usuario.pedidos) ? usuario.pedidos : [])],
                    compras: [pedido, ...(Array.isArray(usuario.compras) ? usuario.compras : [])],
                    gastoTotal: Number(usuario.gastoTotal || 0) + total
                });

                alert(`Pedido confirmado!\nAtendimento: ${atendimento === 'balcao' ? 'Balcão' : atendimento === 'mesa' ? 'Mesa' : 'Entrega'}\n\nTotal: ${formatMoney(total)}`);
                saveCart([]);
                renderCart();
                if (cartContainer) cartContainer.classList.remove('ativo');
            });
        }

        document.addEventListener('click', event => {
            const minus = event.target.closest('.btn-qty-minus');
            const plus = event.target.closest('.btn-qty-plus');
            const removeButton = event.target.closest('.btn-remove-item');

            if (minus) updateCartItem(minus.dataset.id, -1);
            else if (plus) updateCartItem(plus.dataset.id, 1);
            else if (removeButton) removeCartItem(removeButton.dataset.id);
        });

        renderCart();
    }

    function setupLoginForm() {
        const form = document.getElementById('loginForm');
        if (!form) return;

        document.querySelectorAll('.role-option input[name="perfilLogin"]').forEach(input => {
            input.addEventListener('change', () => {
                document.querySelectorAll('.role-option').forEach(option => option.classList.toggle('active', option.querySelector('input').checked));
            });
        });

        form.addEventListener('submit', event => {
            event.preventDefault();
            const email = document.getElementById('email')?.value?.trim() || '';
            const password = document.getElementById('password')?.value || '';
            const selectedRole = document.querySelector('input[name="perfilLogin"]:checked')?.value || 'cliente';

            if (!email || !password) {
                alert('Preencha email e senha.');
                return;
            }

            const resultado = auth.login(email, password, selectedRole);
            if (resultado.success) {
                alert(resultado.message);
                const redirectTarget = isManagerUser(resultado.user) ? 'admin.html' : 'pedidos.html';
                window.location.href = redirectTarget;
            } else {
                alert(resultado.message);
            }
        });
    }

    function setupRegisterForm() {
        const form = document.getElementById('registerForm');
        if (!form) return;

        const toggleManagerCode = () => {
            const isManager = document.querySelector('input[name="perfilCadastro"]:checked')?.value === 'gerente';
            const managerCodeField = document.getElementById('managerCodeField');
            if (managerCodeField) managerCodeField.style.display = isManager ? 'block' : 'none';
            document.querySelectorAll('.role-option').forEach(option => option.classList.toggle('active', option.querySelector('input').checked));
        };

        document.querySelectorAll('input[name="perfilCadastro"]').forEach(input => {
            input.addEventListener('change', toggleManagerCode);
        });
        toggleManagerCode();

        form.addEventListener('submit', event => {
            event.preventDefault();
            const nome = document.getElementById('nome')?.value?.trim() || '';
            const sobrenome = document.getElementById('sobrenome')?.value?.trim() || '';
            const email = document.getElementById('email')?.value?.trim() || '';
            const senha = document.getElementById('senha')?.value || '';
            const confirmarSenha = document.getElementById('confirmar-senha')?.value || '';
            const role = document.querySelector('input[name="perfilCadastro"]:checked')?.value || 'cliente';
            const accessCode = document.getElementById('codigo-gerente')?.value?.trim() || '';

            if (!nome || !sobrenome || !email || !senha || !confirmarSenha) {
                alert('Preencha todos os campos.');
                return;
            }

            if (senha.length < 6) {
                alert('A senha deve ter pelo menos 6 caracteres.');
                return;
            }

            if (senha !== confirmarSenha) {
                alert('As senhas não conferem.');
                return;
            }

            const resultado = auth.register(nome, sobrenome, email, senha, role, accessCode);
            if (resultado.success) {
                alert(resultado.message);
                window.location.href = 'login.html';
            } else {
                alert(resultado.message);
            }
        });
    }

    function setupAdminVisibility() {
        const adminLinkItem = document.getElementById('adminLinkItem');
        if (!adminLinkItem) return;
        adminLinkItem.style.display = isManagerUser(auth.getCurrentUser()) ? 'list-item' : 'none';
    }

    function setupHeaderAccountButton() {
        const link = document.getElementById('headerAccountLink');
        if (!link) return;

        if (auth.isAuthenticated()) {
            link.href = 'conta.html';
            link.innerHTML = '<i class="fas fa-user"></i> Minha conta';
        } else {
            link.href = 'login.html';
            link.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        }

        setupAdminVisibility();
    }

    function setupSidebarMenu() {
        document.querySelectorAll('.menu-item').forEach(item => {
            if (item.classList.contains('logout-btn')) return;

            item.addEventListener('click', event => {
                event.preventDefault();
                document.querySelectorAll('.menu-item').forEach(menu => menu.classList.remove('active'));
                item.classList.add('active');

                const sectionName = item.getAttribute('data-section');
                const target = sectionName ? document.getElementById(`${sectionName}-section`) : null;
                document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
                if (target) target.classList.add('active');
            });
        });
    }

    function setupLogoutButtons() {
        const logoutBtn = document.getElementById('logoutBtn');
        const logoutHeaderBtn = document.getElementById('logoutHeaderBtn');
        const logoutModal = document.getElementById('logoutModal');
        const confirmLogout = document.getElementById('confirmLogout');
        const cancelLogout = document.getElementById('cancelLogout');

        const openLogoutModal = () => {
            if (logoutModal) logoutModal.classList.add('show');
        };

        if (logoutBtn) {
            logoutBtn.addEventListener('click', event => {
                event.preventDefault();
                openLogoutModal();
            });
        }

        if (logoutHeaderBtn) {
            logoutHeaderBtn.addEventListener('click', event => {
                event.preventDefault();
                openLogoutModal();
            });
        }

        if (confirmLogout) {
            confirmLogout.addEventListener('click', () => {
                auth.logout();
                if (logoutModal) logoutModal.classList.remove('show');
                window.location.href = 'index.html';
            });
        }

        if (cancelLogout) {
            cancelLogout.addEventListener('click', () => {
                if (logoutModal) logoutModal.classList.remove('show');
            });
        }

        if (logoutModal) {
            logoutModal.addEventListener('click', event => {
                if (event.target === logoutModal) logoutModal.classList.remove('show');
            });
        }
    }

    function setupNewsletterForms() {
        document.querySelectorAll('form').forEach(form => {
            if (form.id === 'loginForm' || form.id === 'registerForm' || form.classList.contains('auth-form') || form.classList.contains('form-perfil') || form.classList.contains('form-seguranca')) {
                return;
            }

            const emailInput = form.querySelector('input[type="email"]');
            if (!emailInput) return;

            form.addEventListener('submit', event => {
                event.preventDefault();
                const mailValue = emailInput.value.trim();
                if (!mailValue) {
                    alert('Digite um e-mail válido.');
                    return;
                }
                alert('Inscrição realizada com sucesso!');
                form.reset();
            });
        });
    }

    function renderOrders(user) {
        const container = document.querySelector('.pedidos-container');
        if (!container) return;

        const orders = Array.isArray(user?.pedidos) && user.pedidos.length ? user.pedidos : [
            { id: 2024001, status: 'entregue', data: '24 de Setembro, 2024', subtotal: 31.5, entrega: 5, total: 36.5, items: [{ nome: 'Cappuccino Premium', preco: 12, qtd: 2, quantidade: 2 }, { nome: 'Croissant de Chocolate', preco: 7.5, qtd: 1, quantidade: 1 }] },
            { id: 2024002, status: 'enviado', data: '22 de Setembro, 2024', subtotal: 39, entrega: 0, total: 39, items: [{ nome: 'Café Gelado Gourmet', preco: 13, qtd: 3, quantidade: 3 }] }
        ];

        container.innerHTML = orders.map(order => {
            const status = order.status || 'pendente';
            const statusMap = {
                entregue: { label: 'Entregue', badge: 'entregue', icon: 'check-circle' },
                enviado: { label: 'Em Trânsito', badge: 'enviado', icon: 'truck' },
                pendente: { label: 'Processando', badge: 'pendente', icon: 'clock' }
            };
            const currentStatus = statusMap[status] || statusMap.pendente;
            const items = Array.isArray(order.items) && order.items.length ? order.items : [{ nome: 'Pedido', preco: order.total || 0, qtd: 1, quantidade: 1 }];

            return `
                <div class="pedido-card" data-status="${status}">
                    <div class="pedido-header">
                        <div class="pedido-info">
                            <h4>Pedido #${order.id || '2024000'}</h4>
                            <p class="data">${order.data || 'Data não disponível'}</p>
                        </div>
                        <span class="status-badge ${currentStatus.badge}">
                            <i class="fas fa-${currentStatus.icon}"></i> ${currentStatus.label}
                        </span>
                    </div>
                    <div class="pedido-items">
                        ${items.map(item => `
                            <div class="item">
                                <img src="https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=80&h=80&fit=crop" alt="Produto">
                                <div class="item-details">
                                    <p class="item-nome">${item.nome}</p>
                                    <p class="item-qtd">Qtd: ${item.qtd || item.quantidade || 1}</p>
                                </div>
                                <p class="item-preco">${formatMoney((item.preco || 0) * (item.qtd || item.quantidade || 1))}</p>
                            </div>
                        `).join('')}
                    </div>
                    <div class="pedido-footer">
                        <div class="pedido-total">
                            <p>Subtotal: <span>${formatMoney(order.subtotal || order.total || 0)}</span></p>
                            <p>Entrega: <span>${formatMoney(order.entrega || 0)}</span></p>
                            <h5>Total: <span>${formatMoney(order.total || order.subtotal || 0)}</span></h5>
                        </div>
                        <button class="btn-detalhes"><i class="fas fa-eye"></i> Ver Detalhes</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function populateAccountSummary(user) {
        const displayNome = document.getElementById('displayNome');
        const displayEmail = document.getElementById('displayEmail');
        const statPedidos = document.getElementById('statPedidos');
        const statGasto = document.getElementById('statGasto');

        if (displayNome) displayNome.textContent = user?.nomeCompleto || 'Meu perfil';
        if (displayEmail) displayEmail.textContent = user?.email || 'usuario@email.com';
        if (statPedidos) statPedidos.textContent = String(Array.isArray(user?.pedidos) ? user.pedidos.length : 0);
        if (statGasto) statGasto.textContent = formatMoney(Number(user?.gastoTotal || 0));
    }

    function renderAddresses() {
        const grid = document.getElementById('enderecosGrid');
        if (!grid) return;

        const user = auth.getCurrentUser();
        const addresses = Array.isArray(user?.enderecos) && user.enderecos.length ? user.enderecos : [{
            titulo: 'Casa',
            endereco: 'Rua das Flores, 123',
            complemento: 'Apto 501 - Centro',
            cidade: 'São Paulo',
            estado: 'SP',
            cep: '01234-567',
            principal: true
        }];

        grid.innerHTML = addresses.map((endereco, index) => `
            <div class="endereco-card ${endereco.principal ? 'principal' : ''}">
                ${endereco.principal ? '<div class="endereco-badge">Principal</div>' : ''}
                <h5>${endereco.titulo || 'Endereço'}</h5>
                <p>${endereco.endereco || ''}</p>
                <p>${endereco.complemento || ''}</p>
                <p>${endereco.cidade || ''} - ${endereco.estado || ''}, ${endereco.cep || ''}</p>
                <div class="endereco-acoes">
                    <button class="btn-acao btn-editar-endereco" data-index="${index}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-acao btn-remover-endereco" data-index="${index}">
                        <i class="fas fa-trash"></i> Remover
                    </button>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.btn-editar-endereco').forEach(button => {
            button.addEventListener('click', () => {
                const index = Number(button.dataset.index);
                const currentUser = auth.getCurrentUser();
                const addressesList = Array.isArray(currentUser?.enderecos) ? currentUser.enderecos : [];
                const enderecoAtual = addressesList[index];
                if (!enderecoAtual) return;

                const novoTitulo = prompt('Título do endereço:', enderecoAtual.titulo || '');
                if (novoTitulo === null) return;
                const novoEndereco = prompt('Endereço:', enderecoAtual.endereco || '');
                if (novoEndereco === null) return;
                const novoComplemento = prompt('Complemento:', enderecoAtual.complemento || '');
                if (novoComplemento === null) return;
                const novaCidade = prompt('Cidade:', enderecoAtual.cidade || '');
                if (novaCidade === null) return;
                const novoEstado = prompt('Estado:', enderecoAtual.estado || '');
                if (novoEstado === null) return;
                const novoCep = prompt('CEP:', enderecoAtual.cep || '');
                if (novoCep === null) return;

                addressesList[index] = {
                    ...enderecoAtual,
                    titulo: novoTitulo || enderecoAtual.titulo,
                    endereco: novoEndereco || enderecoAtual.endereco,
                    complemento: novoComplemento || enderecoAtual.complemento,
                    cidade: novaCidade || enderecoAtual.cidade,
                    estado: novoEstado || enderecoAtual.estado,
                    cep: novoCep || enderecoAtual.cep
                };

                auth.updateCurrentUser({ enderecos: addressesList });
                renderAddresses();
                alert('Endereço atualizado com sucesso!');
            });
        });

        document.querySelectorAll('.btn-remover-endereco').forEach(button => {
            button.addEventListener('click', () => {
                const index = Number(button.dataset.index);
                const currentUser = auth.getCurrentUser();
                const addressesList = Array.isArray(currentUser?.enderecos) ? currentUser.enderecos : [];
                if (addressesList.length <= 1) {
                    alert('Você precisa manter pelo menos um endereço.');
                    return;
                }
                if (!confirm('Deseja remover este endereço?')) return;
                addressesList.splice(index, 1);
                auth.updateCurrentUser({ enderecos: addressesList });
                renderAddresses();
                alert('Endereço removido com sucesso!');
            });
        });
    }

    function setupAccountPage() {
        if (!/conta\.html$/i.test(window.location.pathname.split('/').pop() || '')) return;

        const user = auth.getCurrentUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        populateAccountSummary(user);
        setupSidebarMenu();
        setupLogoutButtons();

        const profileForm = document.getElementById('formPerfil');
        if (profileForm) {
            const nomeInput = profileForm.querySelector('#perfil-nome');
            const emailInput = profileForm.querySelector('#perfil-email');
            const telefoneInput = profileForm.querySelector('#perfil-telefone');
            const dataInput = profileForm.querySelector('#perfil-data');

            if (nomeInput) nomeInput.value = user.nomeCompleto || '';
            if (emailInput) emailInput.value = user.email || '';
            if (telefoneInput) telefoneInput.value = user.perfil?.telefone || '';
            if (dataInput) dataInput.value = user.perfil?.dataNascimento || '';

            profileForm.addEventListener('submit', event => {
                event.preventDefault();
                const nome = nomeInput?.value?.trim() || '';
                const email = emailInput?.value?.trim() || '';
                const telefone = telefoneInput?.value?.trim() || '';
                const dataNascimento = dataInput?.value || '';

                if (!nome || !email) {
                    alert('Preencha nome e email.');
                    return;
                }

                const nomes = nome.split(/\s+/);
                auth.updateCurrentUser({
                    nome: nomes[0] || '',
                    sobrenome: nomes.slice(1).join(' ') || '',
                    nomeCompleto: nome,
                    email,
                    perfil: { ...(user.perfil || {}), telefone, dataNascimento }
                });

                populateAccountSummary(auth.getCurrentUser());
                alert('Perfil atualizado com sucesso!');
            });
        }

        const securityForm = document.getElementById('formSeguranca');
        if (securityForm) {
            securityForm.addEventListener('submit', event => {
                event.preventDefault();
                const senhaAtual = document.getElementById('senha-atual')?.value || '';
                const novaSenha = document.getElementById('senha-nova')?.value || '';
                const confirmarSenha = document.getElementById('senha-confirma')?.value || '';

                if (!senhaAtual || !novaSenha || !confirmarSenha) {
                    alert('Preencha todos os campos de senha.');
                    return;
                }

                if (hashPassword(senhaAtual) !== user.senha) {
                    alert('Senha atual incorreta.');
                    return;
                }

                if (novaSenha.length < 6) {
                    alert('A nova senha deve ter pelo menos 6 caracteres.');
                    return;
                }

                if (novaSenha !== confirmarSenha) {
                    alert('A confirmação da senha não confere.');
                    return;
                }

                auth.updateCurrentUser({ senha: hashPassword(novaSenha) });
                securityForm.reset();
                alert('Senha atualizada com sucesso!');
            });
        }

        const addButton = document.querySelector('.btn-adicionar-endereco');
        if (addButton) {
            addButton.addEventListener('click', () => {
                const titulo = prompt('Título do endereço (ex.: Casa, Trabalho):');
                if (!titulo) return;
                const endereco = prompt('Endereço:');
                if (!endereco) return;
                const complemento = prompt('Complemento:') || '';
                const cidade = prompt('Cidade:') || '';
                const estado = prompt('Estado (sigla):') || '';
                const cep = prompt('CEP:') || '';

                const currentUser = auth.getCurrentUser();
                const addresses = Array.isArray(currentUser?.enderecos) ? currentUser.enderecos : [];
                auth.updateCurrentUser({
                    enderecos: [...addresses, {
                        id: Date.now(),
                        titulo,
                        endereco,
                        complemento,
                        cidade,
                        estado,
                        cep,
                        principal: addresses.length === 0
                    }]
                });
                renderAddresses();
                alert('Endereço adicionado com sucesso!');
            });
        }

        renderAddresses();
    }

    function setupPedidosPage() {
        if (!/pedidos\.html$/i.test(window.location.pathname.split('/').pop() || '')) return;

        const user = auth.getCurrentUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        const nomeUsuario = document.getElementById('nomeUsuario');
        const emailUsuario = document.getElementById('emailUsuario');
        if (nomeUsuario) nomeUsuario.textContent = user.nomeCompleto || 'Minha conta';
        if (emailUsuario) emailUsuario.textContent = user.email || 'usuario@email.com';

        renderOrders(user);
        setupSidebarMenu();
        setupLogoutButtons();

        const form = document.querySelector('.form-perfil');
        if (form) {
            const inputs = form.querySelectorAll('input');
            if (inputs[0]) inputs[0].value = user.nomeCompleto || '';
            if (inputs[1]) inputs[1].value = user.email || '';
            if (inputs[2]) inputs[2].value = user.perfil?.telefone || '';
            if (inputs[3]) inputs[3].value = user.perfil?.dataNascimento || '';

            form.addEventListener('submit', event => {
                event.preventDefault();
                const nome = inputs[0]?.value?.trim() || '';
                const email = inputs[1]?.value?.trim() || '';
                const telefone = inputs[2]?.value?.trim() || '';
                const dataNascimento = inputs[3]?.value || '';

                if (!nome || !email) {
                    alert('Preencha nome e email.');
                    return;
                }

                auth.updateCurrentUser({
                    nomeCompleto: nome,
                    email,
                    perfil: { ...(user.perfil || {}), telefone, dataNascimento }
                });
                alert('Perfil atualizado com sucesso!');
            });
        }

        document.querySelectorAll('.filtro-btn').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.filtro-btn').forEach(item => item.classList.remove('active'));
                button.classList.add('active');

                const filter = button.getAttribute('data-filtro');
                document.querySelectorAll('.pedido-card').forEach(card => {
                    const status = card.getAttribute('data-status');
                    card.style.display = filter === 'todos' || status === filter ? 'block' : 'none';
                });
            });
        });
    }

    function setupProductFilters() {
        document.querySelectorAll('.filtro-btn').forEach(button => {
            if (button.closest('.filtros-pedidos')) return;

            button.addEventListener('click', () => {
                const filter = button.getAttribute('data-filtro');
                document.querySelectorAll('.filtro-btn').forEach(item => {
                    if (!item.closest('.filtros-pedidos')) item.classList.remove('active');
                });
                button.classList.add('active');

                document.querySelectorAll('.produto-card').forEach(card => {
                    const categoria = card.getAttribute('data-categoria');
                    const shouldShow = filter === 'todos' || categoria === filter;
                    card.style.display = shouldShow ? 'block' : 'none';
                });
            });
        });
    }

    function setupProductButtons() {
        document.addEventListener('click', event => {
            const addButton = event.target.closest('.btn-adicionar');
            if (addButton && addButton.closest('.produto-card')) {
                const card = addButton.closest('.produto-card');
                const nome = card.querySelector('h5')?.textContent?.trim() || 'Produto';
                const precoText = card.querySelector('.preco')?.textContent || '0';
                addToCart(nome, parseCurrency(precoText));
                showToast(`${nome} adicionado ao carrinho!`, 'success');

                const originalHtml = addButton.innerHTML;
                addButton.innerHTML = '<i class="fas fa-check"></i>';
                addButton.classList.add('added');
                setTimeout(() => {
                    addButton.innerHTML = originalHtml;
                    addButton.classList.remove('added');
                }, 800);
            }

            const favoriteButton = event.target.closest('.btn-adicionar-carrinho');
            if (favoriteButton) {
                const card = favoriteButton.closest('.favorito-card');
                if (!card) return;
                const nome = card.querySelector('h5')?.textContent?.trim() || 'Produto';
                const precoText = card.querySelector('.preco')?.textContent || '0';
                addToCart(nome, parseCurrency(precoText));
                showToast(`${nome} adicionado ao carrinho!`, 'success');
            }

            const removeFavoriteButton = event.target.closest('.btn-remover-favorito');
            if (removeFavoriteButton) {
                const card = removeFavoriteButton.closest('.favorito-card');
                if (card) card.remove();
            }
        });
    }

    function init() {
        seedDefaultUser();
        auth.users = auth.loadUsers();
        setupHeaderAccountButton();
        setupAdminVisibility();
        setupCartUI();
        setupNewsletterForms();
        setupLoginForm();
        setupRegisterForm();
        setupProductFilters();
        setupProductButtons();
        setupAccountPage();
        setupPedidosPage();
        setupLogoutButtons();
    }

    document.addEventListener('DOMContentLoaded', init);
    window.addEventListener('load', () => {
        renderCart();
        updateCartBadge();
    });


    (() => {
        function initProfilePhotoUpload() {
            const page = document.body.dataset.page;
            if (page !== 'conta' && page !== 'pedidos') return;

            const input = document.getElementById('profilePhotoInput');
            const image = document.querySelector('.avatar-img, .perfil-avatar img');
            const message = document.getElementById('profilePhotoMessage');

            if (!input || !image || !message) return;

            let email = 'guest';

            try {
                const currentUser = JSON.parse(
                    localStorage.getItem('astracafe_current_user') || 'null'
                );

                if (currentUser?.email) {
                    email = currentUser.email.trim().toLowerCase();
                }
            } catch (error) {
                console.error('Não foi possível carregar os dados do usuário:', error);
            }

            const storageKey = `astracafe_profile_photo:${email}`;
            const savedPhoto = localStorage.getItem(storageKey);

            if (savedPhoto) image.src = savedPhoto;

            input.addEventListener('change', () => {
                const file = input.files?.[0];
                if (!file) return;

                if (!file.type.startsWith('image/')) {
                    message.textContent = 'Escolha um arquivo de imagem.';
                    input.value = '';
                    return;
                }

                if (file.size > 2 * 1024 * 1024) {
                    message.textContent = 'A imagem deve ter no máximo 2 MB.';
                    input.value = '';
                    return;
                }

                const reader = new FileReader();

                reader.onload = () => {
                    if (typeof reader.result !== 'string') {
                        message.textContent = 'Não foi possível carregar a imagem.';
                        return;
                    }

                    try {
                        localStorage.setItem(storageKey, reader.result);
                        image.src = reader.result;
                        message.textContent = 'Foto de perfil atualizada.';
                    } catch (error) {
                        message.textContent = 'Não foi possível salvar a foto neste navegador.';
                        console.error('Erro ao salvar a foto de perfil:', error);
                    }
                };

                reader.onerror = () => {
                    message.textContent = 'Não foi possível ler o arquivo de imagem.';
                };

                reader.readAsDataURL(file);
            });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initProfilePhotoUpload);
        } else {
            initProfilePhotoUpload();
        }
    })();
})();





// codigo de acesso para o admin: 'ASTROCAFEGERENTE2024'