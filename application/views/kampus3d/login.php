<?php defined('BASEPATH') OR exit('No direct script access allowed');
$a = $assetBase;
?><!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Login &mdash; Editor Kampus 3D</title>
<link rel="stylesheet" href="<?php echo $a; ?>css/kampus3d.css">
<style>
  .login-wrapper {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 24px 16px;
    background: radial-gradient(circle at 50% 20%, var(--accent-soft) 0%, var(--bg) 65%);
    position: relative;
    overflow: hidden;
  }
  .login-grid-bg {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(var(--grid-b) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-b) 1px, transparent 1px);
    background-size: 32px 32px;
    opacity: 0.45;
    pointer-events: none;
    mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
  }
  .login-card {
    position: relative;
    width: 100%;
    max-width: 400px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 32px 28px;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08);
    backdrop-filter: blur(10px);
    z-index: 1;
    animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .login-header {
    text-align: center;
    margin-bottom: 24px;
  }
  .login-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--accent-soft);
    color: var(--accent);
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 12px;
  }
  .login-badge svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .login-header h1 {
    margin: 0 0 6px;
    font-size: 22px;
    font-weight: 700;
    color: var(--fg);
    letter-spacing: -0.01em;
  }
  .login-header p {
    margin: 0;
    font-size: 13px;
    color: var(--muted);
    line-height: 1.4;
  }
  .login-alert {
    background: var(--warn-soft);
    color: var(--danger);
    border: 1px solid rgba(179, 54, 44, 0.25);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
  }
  .login-alert svg {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
  }
  .login-form .field {
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .login-form label {
    font-size: 13px;
    font-weight: 500;
    color: var(--fg);
  }
  .input-with-icon {
    position: relative;
    display: flex;
    align-items: center;
  }
  .input-with-icon svg.input-icon {
    position: absolute;
    left: 12px;
    width: 16px;
    height: 16px;
    color: var(--muted);
    pointer-events: none;
    stroke: currentColor;
    fill: none;
    stroke-width: 2;
  }
  .input-with-icon input {
    padding-left: 36px;
    padding-right: 12px;
    height: 40px;
    font-size: 14px;
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 8px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .input-with-icon input:focus {
    border-color: var(--accent);
    outline: none;
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .pw-toggle {
    position: absolute;
    right: 8px;
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
  }
  .pw-toggle:hover {
    color: var(--fg);
  }
  .login-btn {
    width: 100%;
    height: 42px;
    margin-top: 10px;
    background: var(--accent);
    color: var(--accent-fg);
    border: 1px solid var(--accent);
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: opacity 0.15s, transform 0.1s;
  }
  .login-btn:hover {
    opacity: 0.92;
  }
  .login-btn:active {
    transform: scale(0.99);
  }
  .login-info-box {
    margin-top: 20px;
    padding: 10px 14px;
    background: var(--bg);
    border: 1px dashed var(--line);
    border-radius: 8px;
    font-size: 12px;
    color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .login-info-box code {
    font-family: var(--font-mono);
    color: var(--fg);
    background: var(--panel);
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--line);
  }
  .login-footer {
    text-align: center;
    margin-top: 24px;
    font-size: 13px;
  }
  .login-footer a {
    color: var(--muted);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: color 0.15s;
  }
  .login-footer a:hover {
    color: var(--accent);
  }
</style>
</head>
<body>
<div class="login-wrapper">
  <div class="login-grid-bg" aria-hidden="true"></div>

  <div class="login-card">
    <div class="login-header">
      <div class="login-badge">
        <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        Kampus 3D
      </div>
      <h1>Masuk ke Editor</h1>
      <p>Masuk untuk mengelola model, denah gedung, ruang, dan fasilitas kampus.</p>
    </div>

    <?php if ( ! empty($error)): ?>
      <div class="login-alert" role="alert">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span><?php echo html_escape($error); ?></span>
      </div>
    <?php endif; ?>

    <form class="login-form" method="post" action="<?php echo html_escape(isset($urlAksi) ? $urlAksi : site_url('login')); ?>" autocomplete="on">
      <?php if ( ! empty($csrf) && is_array($csrf) && isset($csrf['name'], $csrf['hash'])): ?>
        <input type="hidden" name="<?php echo html_escape($csrf['name']); ?>" value="<?php echo html_escape($csrf['hash']); ?>">
      <?php endif; ?>

      <div class="field">
        <label for="username">Username</label>
        <div class="input-with-icon">
          <svg class="input-icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <input type="text" id="username" name="username" value="<?php echo html_escape($username); ?>" placeholder="Masukkan username" required autofocus autocomplete="username">
        </div>
      </div>

      <div class="field">
        <label for="password">Password</label>
        <div class="input-with-icon">
          <svg class="input-icon" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <input type="password" id="password" name="password" placeholder="Masukkan password" required autocomplete="current-password">
          <button type="button" class="pw-toggle" id="pwToggle" aria-label="Lihat password" title="Tampilkan/sembunyikan password">
            <svg id="eyeIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
        </div>
      </div>

      <button type="submit" class="login-btn">
        <span>Masuk</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
      </button>

      <div class="login-info-box">
        <span>Akun bawaan sistem:</span>
        <code>admin / admin123</code>
      </div>
    </form>

    <div class="login-footer">
      <a href="<?php echo html_escape(isset($urlPublik) ? $urlPublik : site_url()); ?>">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Halaman Publik Kampus 3D
      </a>
    </div>
  </div>
</div>

<script>
  (function() {
    var pwInput = document.getElementById('password');
    var pwToggle = document.getElementById('pwToggle');
    var eyeIcon = document.getElementById('eyeIcon');
    if (pwToggle && pwInput) {
      pwToggle.addEventListener('click', function() {
        var isText = pwInput.type === 'text';
        pwInput.type = isText ? 'password' : 'text';
        eyeIcon.innerHTML = isText 
          ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>'
          : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
      });
    }
  })();
</script>
</body>
</html>
