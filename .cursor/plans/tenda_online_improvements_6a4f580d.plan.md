---
name: Tenda Online Improvements
overview: "Reorganize the tenda_online repo into a clean directory structure, then implement four features: gettext i18n (ca/es/en), full authentication system, bcrypt password hashing, and thorough security hardening."
todos:
  - id: reorg
    content: "Reorganize repo: create public/, includes/, lang/, docker/, sql/ directories; move and rename files; update Docker config with custom Apache vhost"
    status: pending
  - id: i18n
    content: "Implement i18n with gettext: install gettext in Docker, create includes/i18n.php with locale setup, create locale/{ca,es,en}/LC_MESSAGES/ .po/.mo files, add language switcher to header, replace all hardcoded strings with _() calls"
    status: pending
  - id: auth
    content: "Full auth system: create includes/auth.php, public/login.php, public/register.php, public/logout.php, public/profile.php; update header nav; protect admin pages; update checkout flow"
    status: pending
  - id: hashing
    content: "Password hashing: update sql seed data with bcrypt hashes, use password_hash/password_verify in auth.php, remove $_SESSION['password'] everywhere"
    status: pending
  - id: security
    content: "Security hardening: fix all SQL injection (prepared statements), add CSRF (includes/csrf.php + all forms), session hardening, security headers, rate limiting, e() escaping helper, input validation"
    status: pending
isProject: false
---

# Tenda Online: Reorganize, i18n, Auth, Hashing, and Security

## 0. Repo Reorganization

Currently all PHP pages, config, Docker files, docs, and images sit flat in the root. Reorganize into:

```
tenda_online/
├── public/                    # Apache DocumentRoot (only web-accessible files)
│   ├── index.php
│   ├── category.php
│   ├── product.php
│   ├── cart.php               # renamed from cart_page.php
│   ├── checkout.php           # renamed from checkout_page.php
│   ├── order-review.php       # renamed from order_review.php
│   ├── process-order.php      # renamed from process_order.php
│   ├── login.php              # NEW
│   ├── register.php           # NEW
│   ├── logout.php             # NEW
│   ├── profile.php            # NEW (order history)
│   ├── admin/
│   │   ├── orders.php         # renamed from admin_orders.php
│   │   └── order-details.php  # renamed from order_details.php
│   ├── css/                   # all stylesheets (unchanged)
│   └── images/                # renamed from imatges/
├── includes/                  # Shared PHP (NOT web-accessible)
│   ├── config.php             # renamed from db_connect.php, adds session config
│   ├── header.php
│   ├── footer.php             # NEW (optional)
│   ├── auth.php               # NEW - auth helpers (login, register, require_login, require_admin)
│   ├── csrf.php               # NEW - CSRF token generation/validation
│   ├── security.php           # NEW - security headers, rate limiting, input helpers
│   └── i18n.php               # NEW - translation loader + t() helper
├── locale/                    # gettext translation files
│   ├── ca_ES/
│   │   └── LC_MESSAGES/
│   │       ├── messages.po    # Catalan translations (source)
│   │       └── messages.mo    # Catalan translations (compiled binary)
│   ├── es_ES/
│   │   └── LC_MESSAGES/
│   │       ├── messages.po
│   │       └── messages.mo
│   └── en_US/
│       └── LC_MESSAGES/
│           ├── messages.po
│           └── messages.mo
├── docker/
│   ├── docker-compose.yml
│   ├── init-db.sh
│   └── apache-vhost.conf      # NEW - point DocumentRoot to public/
├── sql/
│   └── tenda_online.sql       # schema + seed data (passwords updated to bcrypt hashes)
├── docs/                      # existing PDFs
├── README.md
├── Makefile
└── .gitignore
```

Key changes:

- `**public/**` becomes the Apache DocumentRoot so `includes/`, `lang/`, `sql/` are not web-accessible
- `**includes/**` holds all shared PHP that pages `require_once`
- Page names simplified (no `_page` suffix, use hyphens)
- Docker files moved to `docker/` subdirectory
- Product images renamed from `imatges/` to `images/`
- Update `docker-compose.yml` to mount `public/` as DocumentRoot and `includes/` + `locale/` as volumes, plus a custom Apache vhost config; install `gettext` PHP extension + system locales in the Docker image
- All `include 'header.php'` / `include 'db_connect.php'` paths updated to use `require_once __DIR__ . '/../includes/...'`

## 1. Add multiple languages (gettext, ca/es/en)

### How gettext works (overview)

```
Source code          Extraction         Translation        Compilation
PHP files with  -->  xgettext  -->  messages.pot  -->  messages.po  -->  msgfmt  -->  messages.mo
_("string")          (scan)         (template)         (per lang)        (compile)    (binary, fast)
```

1. You wrap every user-facing string in `_("...")` (the gettext shorthand function)
2. `xgettext` scans your PHP files and extracts all those strings into a `.pot` template
3. Translators copy the `.pot` to a `.po` file per language and fill in translations
4. `msgfmt` compiles each `.po` into a binary `.mo` file that PHP reads at runtime

### Docker setup

Update `docker-compose.yml` to use a custom Dockerfile that installs:

- The PHP `gettext` extension
- System locale packages for `ca_ES.UTF-8`, `es_ES.UTF-8`, `en_US.UTF-8`

```dockerfile
FROM php:8.2-apache
RUN apt-get update && apt-get install -y locales gettext \
    && sed -i '/ca_ES.UTF-8/s/^# //' /etc/locale.gen \
    && sed -i '/es_ES.UTF-8/s/^# //' /etc/locale.gen \
    && sed -i '/en_US.UTF-8/s/^# //' /etc/locale.gen \
    && locale-gen \
    && docker-php-ext-install mysqli gettext
```

### Translation loader: `[includes/i18n.php](includes/i18n.php)`

```php
$SUPPORTED_LOCALES = ['ca' => 'ca_ES.UTF-8', 'es' => 'es_ES.UTF-8', 'en' => 'en_US.UTF-8'];

function set_locale(string $lang): void {
    global $SUPPORTED_LOCALES;
    if (!isset($SUPPORTED_LOCALES[$lang])) $lang = 'ca';
    $_SESSION['locale'] = $lang;
}

function init_gettext(): void {
    global $SUPPORTED_LOCALES;
    $lang = $_SESSION['locale'] ?? 'ca';
    $locale = $SUPPORTED_LOCALES[$lang] ?? 'ca_ES.UTF-8';

    putenv("LC_ALL=$locale");
    setlocale(LC_ALL, $locale);

    $domain = 'messages';
    bindtextdomain($domain, dirname(__DIR__) . '/locale');
    bind_textdomain_codeset($domain, 'UTF-8');
    textdomain($domain);
}

init_gettext();
```

After this runs, all `_("string")` calls return the translated version for the active locale.

### Directory structure

```
locale/
├── ca_ES/LC_MESSAGES/messages.po   # Catalan (source language, msgid == msgstr)
├── ca_ES/LC_MESSAGES/messages.mo   # Compiled
├── es_ES/LC_MESSAGES/messages.po   # Spanish translations
├── es_ES/LC_MESSAGES/messages.mo
├── en_US/LC_MESSAGES/messages.po   # English translations
├── en_US/LC_MESSAGES/messages.mo
└── messages.pot                    # Template (generated by xgettext)
```

### Example .po file (es_ES)

```po
msgid "Benvinguts a la nostra botiga online de roba"
msgstr "Bienvenidos a nuestra tienda online de ropa"

msgid "Cistella"
msgstr "Cesta"

msgid "Pàgina principal"
msgstr "Página principal"

msgid "Contrasenya"
msgstr "Contraseña"
```

### Language switcher

Add `?lang=ca|es|en` handler in `[includes/config.php](includes/config.php)` and render a switcher in `[includes/header.php](includes/header.php)` (three text links: CA | ES | EN).

### What changes in existing pages

Every hardcoded string like `"Benvinguts a la nostre botiga online de roba"` becomes `<?= _('Benvinguts a la nostra botiga online de roba') ?>`. The key difference from PHP arrays: **the original Catalan string IS the key** (no abstract key names). This is the standard gettext convention -- the source language string serves as both the identifier and the default fallback.

### Generating/updating translations

After changing strings in the PHP source, regenerate the template and update `.po` files:

```bash
# Extract translatable strings from all PHP files
xgettext --from-code=UTF-8 -o locale/messages.pot public/*.php includes/*.php public/admin/*.php

# Merge new strings into existing .po files (preserves existing translations)
msgmerge -U locale/es_ES/LC_MESSAGES/messages.po locale/messages.pot
msgmerge -U locale/en_US/LC_MESSAGES/messages.po locale/messages.pot

# Compile .po -> .mo (must be done after every .po edit)
msgfmt -o locale/es_ES/LC_MESSAGES/messages.mo locale/es_ES/LC_MESSAGES/messages.po
msgfmt -o locale/en_US/LC_MESSAGES/messages.mo locale/en_US/LC_MESSAGES/messages.po
msgfmt -o locale/ca_ES/LC_MESSAGES/messages.mo locale/ca_ES/LC_MESSAGES/messages.po
```

A `Makefile` target will be added to automate this.

## 2. Full login and authentication

### New database column

Add `Data_Creacio TIMESTAMP DEFAULT CURRENT_TIMESTAMP` to `Usuaris` table in `tenda_online.sql`.

### New files

- `**[public/login.php](public/login.php)**`: Login form (email + password), POSTs to self, calls `auth_login()`, redirects to `index.php` on success.
- `**[public/register.php](public/register.php)**`: Register form (name, email, password, confirm password, address), POSTs to self, calls `auth_register()`, auto-logs in after registration.
- `**[public/logout.php](public/logout.php)**`: Destroys session, redirects to `index.php`.
- `**[public/profile.php](public/profile.php)**`: Shows logged-in user's order history (queries `Comandes` + `Detall_Comandes` for their `user_id`). Protected by `require_login()`.
- `**[includes/auth.php](includes/auth.php)**`: Helper functions:
  - `auth_login($conn, $email, $password)` -- validate with `password_verify`, set session
  - `auth_register($conn, $name, $email, $password, $address)` -- hash with `password_hash`, insert
  - `auth_logout()` -- destroy session
  - `is_logged_in()` -- check session
  - `is_admin()` -- check session role
  - `require_login()` -- redirect to login if not authenticated
  - `require_admin()` -- redirect to login if not admin
  - `current_user_id()` -- return session user ID

### Header changes

`[includes/header.php](includes/header.php)` shows:

- If logged in: "Hello, {name}" + Cart + Profile + Logout (+ Admin link if admin role)
- If not logged in: Login + Register + Cart

### Admin protection

`[public/admin/orders.php](public/admin/orders.php)` and `[public/admin/order-details.php](public/admin/order-details.php)` call `require_admin()` at the top.

### Checkout changes

`[public/checkout.php](public/checkout.php)` is simplified:

- If logged in: pre-fill name/email/address from session, skip password field
- If guest: keep existing guest flow but also offer "Login" / "Register" links

## 3. Password hashing (bcrypt)

### Schema seed data

Update `[sql/tenda_online.sql](sql/tenda_online.sql)` to store bcrypt hashes instead of plain text:

```sql
-- Generated with: password_hash('password123', PASSWORD_BCRYPT)
INSERT INTO Usuaris (..., Contrasenya, ...) VALUES (..., '$2y$10$...hash...', ...);
```

The `Contrasenya` column is already `VARCHAR(255)` so it fits bcrypt's 60-char output.

### Code changes

- `auth_register()` uses `password_hash($password, PASSWORD_BCRYPT)`
- `auth_login()` uses `password_verify($password, $storedHash)`
- Guest users get a random hash: `password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT)`
- Remove `$_SESSION['password']` everywhere -- passwords never stored in session

## 4. Thorough security hardening

### 4a. SQL injection -- prepared statements everywhere

Fix all raw-interpolated queries. Files affected:

- `index.php` line 30: `"... ID_Categoria = " . $category['ID_Categoria']`
- `category.php`: `$category_id` interpolated
- `product.php`: `$product_id` interpolated
- `cart.php` (was `cart_page.php`): `$id` in `calculateTotal`
- `checkout.php`: `$id` in `calculateTotal`
- `order-review.php`: `$id` in price lookup
- `admin/order-details.php`: `$order_id` interpolated

All become `$stmt = $conn->prepare("... WHERE col = ?"); $stmt->bind_param(...)`.

### 4b. CSRF protection

New file `[includes/csrf.php](includes/csrf.php)`:

```php
function csrf_token(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}
function csrf_field(): string {
    return '<input type="hidden" name="csrf_token" value="' . csrf_token() . '">';
}
function csrf_verify(): void {
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $_POST['csrf_token'] ?? '')) {
        http_response_code(403);
        die('Invalid CSRF token.');
    }
}
```

Add `<?= csrf_field() ?>` to every `<form>` and `csrf_verify()` at the top of every POST handler.

### 4c. Session hardening in `[includes/config.php](includes/config.php)`

```php
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.use_strict_mode', 1);
session_start();
session_regenerate_id(); // on login
```

### 4d. Security headers in `[includes/security.php](includes/security.php)`

```php
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'");
```

Included from `config.php` so it runs on every page.

### 4e. Rate limiting on login

Simple file/session-based approach: track failed attempts per IP in `$_SESSION` or a temp file. Lock out after 5 failed attempts for 15 minutes. Implemented in `auth_login()`.

### 4f. Consistent output escaping

Audit all `echo` statements. Ensure every DB value or user input rendered in HTML goes through `htmlspecialchars($val, ENT_QUOTES, 'UTF-8')`. Create a helper `e()` in `security.php`:

```php
function e(string $s): string {
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}
```

### 4g. Input validation

Add `validate_email()`, `validate_required()` helpers in `security.php`. Used in register, login, and checkout forms.

### 4h. Remove password from session

Delete all `$_SESSION['password'] = ...` lines from checkout and order review flows.