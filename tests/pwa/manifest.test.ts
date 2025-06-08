import fs from 'fs';
import path from 'path';

describe('PWA Manifest', () => {
  test('manifest.json is valid and contains required fields', () => {
    const manifestPath = path.join(__dirname, '../../public/manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    expect(manifest.name).toBe('Markdown to Podcast');
    expect(manifest.short_name).toBe('MD2Podcast');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#1e40af');
    expect(manifest.background_color).toBe('#ffffff');
    expect(manifest.share_target).toBeDefined();
    expect(manifest.icons).toHaveLength(8);
  });

  test('share_target configuration is correct', () => {
    const manifestPath = path.join(__dirname, '../../public/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    expect(manifest.share_target).toEqual({
      action: '/share',
      method: 'POST',
      enctype: 'application/x-www-form-urlencoded',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
      },
    });
  });

  test('icons have required sizes', () => {
    const manifestPath = path.join(__dirname, '../../public/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    const requiredSizes = ['72x72', '96x96', '128x128', '144x144', '152x152', '192x192', '384x384', '512x512'];
    const manifestSizes = manifest.icons.map((icon: any) => icon.sizes);
    
    requiredSizes.forEach(size => {
      expect(manifestSizes).toContain(size);
    });
  });

  test('shortcuts are properly configured', () => {
    const manifestPath = path.join(__dirname, '../../public/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    expect(manifest.shortcuts).toHaveLength(2);
    expect(manifest.shortcuts[0].name).toBe('Generate from URL');
    expect(manifest.shortcuts[0].url).toBe('/?mode=url');
    expect(manifest.shortcuts[1].name).toBe('Paste Markdown');
    expect(manifest.shortcuts[1].url).toBe('/?mode=paste');
  });

  test('service worker registration in HTML', () => {
    const htmlPath = path.join(__dirname, '../../public/index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    
    expect(html).toContain('navigator.serviceWorker.register');
    expect(html).toContain('/service-worker.js');
    expect(html).toContain('beforeinstallprompt');
  });

  test('PWA meta tags are present in HTML', () => {
    const htmlPath = path.join(__dirname, '../../public/index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    
    expect(html).toContain('<meta name="theme-color"');
    expect(html).toContain('<meta name="apple-mobile-web-app-capable"');
    expect(html).toContain('<link rel="manifest"');
    expect(html).toContain('<link rel="apple-touch-icon"');
  });

  test('required icon files exist', () => {
    const iconsDir = path.join(__dirname, '../../public/icons');
    const requiredIcons = [
      'icon-72x72.png',
      'icon-96x96.png', 
      'icon-128x128.png',
      'icon-144x144.png',
      'icon-152x152.png',
      'icon-192x192.png',
      'icon-384x384.png',
      'icon-512x512.png',
      'favicon-16x16.png',
      'favicon-32x32.png'
    ];
    
    requiredIcons.forEach(icon => {
      const iconPath = path.join(iconsDir, icon);
      expect(fs.existsSync(iconPath)).toBe(true);
    });
  });
});