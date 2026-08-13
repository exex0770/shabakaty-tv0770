const fs = require('fs');
const path = require('path');

const GROUPS = {
  '1': {
    nameEn: 'BEIN SPORTS SD',
    nameAr: 'بي إن سبورتس SD',
    file: 'bein_sports.m3u'
  },
  '2': {
    nameEn: 'ALWAN SPORT SD',
    nameAr: 'ألوان سبورت SD',
    file: 'alwan_sport.m3u'
  }
};

const LOGO =
  'https://i.imageupload.app/6a082ae964db7774dd08.png';

function readPlaylist(groupId) {
  const group = GROUPS[groupId];

  if (!group) return [];

  const filePath = path.join(
    process.cwd(),
    'channels',
    group.file
  );

  const text = fs
    .readFileSync(filePath, 'utf8')
    .replace(/^\uFEFF/, '');

  const lines = text
    .split(/\r?\n/)
    .map(x => x.trim())
    .filter(Boolean);

  const channels = [];

  for (let i = 0; i < lines.length; i++) {

    if (!lines[i].startsWith('#EXTINF')) {
      continue;
    }

    const info = lines[i];

    let link = '';

    if (
      lines[i + 1] &&
      !lines[i + 1].startsWith('#')
    ) {
      link = lines[++i];
    }

    const nameMatch = info.match(/,(.*)$/);
    const logoMatch = info.match(/tvg-logo="([^"]*)"/i);

    const name = nameMatch
      ? nameMatch[1].trim()
      : `Channel ${channels.length + 1}`;

    const logo = logoMatch
      ? logoMatch[1]
      : LOGO;

    channels.push({
      id: String(channels.length + 1),

      id_sliders: null,
      id_custom_list: null,

      name_en: name,
      name_ar: name,

      id_groups: String(groupId),

      groups_name_en: group.nameEn,
      groups_name_ar: group.nameAr,

      groups_main_icon: LOGO,
      groups_sub_icon: LOGO,
      groups_logo: LOGO,
      groups_mobile_logo: LOGO,

      groups_link: '',

      logo: logo,
      mobile_logo: logo,
      real_channel_logo: logo,

      logo_name: name,

      link: link,
      link2: '',
      link3: ''
    });
  }

  return channels;
}

function success(data) {
  return {
    api_status: 200,
    api_message: 'success',
    data: data
  };
}

module.exports = (req, res) => {

  const url = new URL(
    req.url,
    'https://localhost'
  );

  const pathname =
    url.pathname.replace(/\/+$/, '') || '/';

  const groupId =
    url.searchParams.get('id_groups') ||
    url.searchParams.get('group');

  const channelId =
    url.searchParams.get('id_channel');

  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  );

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, OPTIONS'
  );

  res.setHeader(
    'Cache-Control',
    'no-store'
  );

  res.setHeader(
    'Content-Type',
    'application/json; charset=utf-8'
  );

  try {

    // =========================
    // /api?group=1
    // /api?id_groups=1
    // =========================

    if (
      pathname === '/api' &&
      groupId
    ) {

      if (!GROUPS[groupId]) {
        return res.status(400).json({
          api_status: 400,
          api_message: 'Invalid group',
          data: []
        });
      }

      const channels =
        readPlaylist(groupId);

      return res
        .status(200)
        .json(success(channels));
    }


    // =========================
    // /api
    // =========================

    if (
      pathname === '/api' &&
      !groupId
    ) {

      const groups =
        Object.entries(GROUPS).map(
          ([id, group]) => ({
            id: id,
            name_en: group.nameEn,
            name_ar: group.nameAr,

            logo: LOGO,
            mobile_logo: LOGO,
            main_icon: LOGO,
            sub_icon: LOGO,

            link: '',
            Maintenance: '0'
          })
        );

      return res
        .status(200)
        .json(success(groups));
    }


    // =========================
    // /api/groups
    // =========================

    if (
      pathname === '/api/groups'
    ) {

      const groups =
        Object.entries(GROUPS).map(
          ([id, group]) => ({
            id: id,

            name_en: group.nameEn,
            name_ar: group.nameAr,

            logo: LOGO,
            mobile_logo: LOGO,
            main_icon: LOGO,
            sub_icon: LOGO,

            link: '',
            Maintenance: '0'
          })
        );

      return res
        .status(200)
        .json(success(groups));
    }


    // =========================
    // /api/channels?group=1
    // =========================

    if (
      pathname === '/api/channels'
    ) {

      const id = groupId || '1';

      return res
        .status(200)
        .json(
          success(readPlaylist(id))
        );
    }


    // =========================
    // /api/channel?id_channel=1
    // =========================

    if (
      pathname === '/api/channel'
    ) {

      let channels = [];

      for (
        const id of Object.keys(GROUPS)
      ) {
        channels =
          channels.concat(
            readPlaylist(id)
          );
      }

      const channel =
        channels.find(
          x => x.id === channelId
        );

      return res
        .status(200)
        .json(
          success(
            channel ? [channel] : []
          )
        );
    }


    // =========================
    // Empty endpoints
    // =========================

    if (
      pathname === '/api/sliders' ||
      pathname === '/api/slider_items' ||
      pathname === '/api/custom_list' ||
      pathname === '/api/custom_list_items' ||
      pathname === '/api/schedules'
    ) {

      return res
        .status(200)
        .json(success([]));
    }


    return res
      .status(404)
      .json({
        api_status: 404,
        api_message: 'Not found',
        data: []
      });

  } catch (error) {

    console.error(error);

    return res
      .status(500)
      .json({
        api_status: 500,
        api_message: 'Server error',
        data: []
      });
  }
};
