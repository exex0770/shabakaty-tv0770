const fs = require('fs');
const path = require('path');

const GROUPS = {
  '1': { nameEn: 'BEIN SPORTS SD', nameAr: 'بي إن سبورتس SD', file: 'bein_sports.m3u' },
  '2': { nameEn: 'ALWAN SPORT SD', nameAr: 'ألوان سبورت SD', file: 'alwan_sport.m3u' }
};

function readPlaylist(groupId) {
  const group = GROUPS[groupId];
  if (!group) return [];
  const file = path.join(process.cwd(), 'channels', group.file);
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('#EXTINF')) continue;
    const info = lines[i];
    const url = lines[i + 1] && !lines[i + 1].startsWith('#') ? lines[++i] : '';
    const nameMatch = info.match(/,(.*)$/);
    const logoMatch = info.match(/tvg-logo="([^"]*)"/i);
    const name = nameMatch ? nameMatch[1].trim() : `Channel ${result.length + 1}`;
    const logo = logoMatch ? logoMatch[1] : '';
    result.push({
      id: String(result.length + 1),
      id_sliders: null,
      id_custom_list: null,
      name_en: name,
      name_ar: name,
      id_groups: String(groupId),
      groups_name_en: group.nameEn,
      groups_name_ar: group.nameAr,
      groups_main_icon: logo,
      groups_sub_icon: logo,
      groups_logo: logo,
      groups_mobile_logo: logo,
      groups_link: '',
      logo,
      mobile_logo: logo,
      real_channel_logo: logo,
      logo_name: name,
      link: url,
      link2: '',
      link3: ''
    });
  }
  return result;
}

function ok(data) {
  return { api_status: 200, api_message: 'success', data };
}

module.exports = (req, res) => {
  const url = new URL(req.url, 'https://localhost');
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const groupId = url.searchParams.get('id_groups') || url.searchParams.get('group') || '1';
  const channelId = url.searchParams.get('id_channel');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    if (pathname === '/api' || pathname === '/') {
      return res.status(200).json({
        status: 'success',
        groups: Object.entries(GROUPS).map(([id, g]) => ({
          id, name: g.nameEn, endpoint: `/api?group=${id}`
        }))
      });
    }

    if (pathname === '/api/groups') {
      const data = Object.entries(GROUPS).map(([id, g]) => ({
        id,
        name_en: g.nameEn,
        name_ar: g.nameAr,
        logo: 'https://i.imageupload.app/6a082ae964db7774dd08.png',
        mobile_logo: 'https://i.imageupload.app/6a082ae964db7774dd08.png',
        main_icon: 'https://i.imageupload.app/6a082ae964db7774dd08.png',
        sub_icon: 'https://i.imageupload.app/6a082ae964db7774dd08.png',
        link: '',
        Maintenance: '0'
      }));
      return res.status(200).json(ok(data));
    }

    if (pathname === '/api/channels') {
      return res.status(200).json(ok(readPlaylist(groupId)));
    }

    if (pathname === '/api/channel') {
      const all = Object.keys(GROUPS).flatMap(g => readPlaylist(g));
      const item = all.find(c => c.id === channelId);
      return res.status(200).json(ok(item ? [item] : []));
    }

    if (pathname === '/api/sliders' || pathname === '/api/slider_items' ||
        pathname === '/api/custom_list' || pathname === '/api/custom_list_items' ||
        pathname === '/api/schedules') {
      return res.status(200).json(ok([]));
    }

    return res.status(404).json({ api_status: 404, api_message: 'Not found', data: [] });
  } catch (e) {
    return res.status(500).json({ api_status: 500, api_message: 'Server error', data: [] });
  }
};
