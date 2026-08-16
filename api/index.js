const fs = require('fs');
const path = require('path');

const GROUPS = {
  '1': {
    nameEn: 'BEIN SPORTS',
    nameAr: 'BEIN SPORTS',
    file: 'bein_sports.m3u'
  },

  '2': {
    nameEn: 'beIN SPORTS Shabakaty TV',
    nameAr: 'beIN SPORTS Shabakaty TV',
    file: 'beIN SPORTS Shabakaty TV.m3u'
  },

  '3': {
    nameEn: 'ALWAN SPORT',
    nameAr: 'ALWAN SPORT',
    file: 'alwan_sport.m3u'
  },

  '4': {
    nameEn: 'TOD Shabakaty TV Plus',
    nameAr: 'TOD Shabakaty TV Plus',
    file: 'TOD Shabakaty TV Plus.m3u'
  },

  '5': {
    nameEn: 'ALKASS SPORTS',
    nameAr: 'ALKASS SPORTS',
    file: 'alkass.m3u'
  }
};

const LOGO =
  'https://i.imageupload.app/6a082ae964db7774dd08.png';


/* =========================================
   READ M3U PLAYLIST
========================================= */

function readPlaylist(groupId) {

  const group = GROUPS[String(groupId)];

  if (!group) return [];

  const filePath = path.join(
    process.cwd(),
    'channels',
    group.file
  );

  if (!fs.existsSync(filePath)) {
    console.error('M3U FILE NOT FOUND:', filePath);
    return [];
  }

  let text;

  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error('READ FILE ERROR:', error);
    return [];
  }

  text = text.replace(/^\uFEFF/, '');

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  /*
   * Supported quality labels.
   * The API only creates a quality when that quality
   * actually exists in the M3U entry.
   */
  const QUALITY_ORDER = [
    'LOW',
    'SD',
    'HD',
    'FHD',
    'UHD',
    '4K',
    'HDR'
  ];

  const QUALITY_REGEX =
    /\s*\[\s*(LOW|SD|HD|FHD|UHD|4K|HDR)\s*\]\s*$/i;

  /*
   * Remove a quality suffix from a channel name.
   * Example:
   *   "beIN SPORTS 1 [HD]" -> "beIN SPORTS 1"
   */
  function parseQuality(rawName) {
    const name = String(rawName || '').trim();
    const match = name.match(QUALITY_REGEX);

    if (!match) {
      return {
        baseName: name,
        quality: null
      };
    }

    return {
      baseName: name
        .replace(QUALITY_REGEX, '')
        .trim(),
      quality: match[1].toUpperCase()
    };
  }

  /*
   * Keep channels separate by their real base name.
   * We intentionally do NOT use tvg-id as the grouping key,
   * because different channels can share the same tvg-id.
   */
  const grouped = new Map();

  for (let i = 0; i < lines.length; i++) {

    const info = lines[i];

    if (!info.toUpperCase().startsWith('#EXTINF')) {
      continue;
    }

    const nameMatch = info.match(/,(.*)$/);

    const rawName =
      nameMatch && nameMatch[1]
        ? nameMatch[1].trim()
        : `Channel ${grouped.size + 1}`;

    const parsed = parseQuality(rawName);

    const baseName =
      parsed.baseName ||
      `Channel ${grouped.size + 1}`;

    const logoMatch =
      info.match(/tvg-logo\s*=\s*"([^"]*)"/i);

    const channelLogo =
      logoMatch && logoMatch[1]
        ? logoMatch[1].trim()
        : LOGO;

    const groupTitleMatch =
      info.match(/group-title\s*=\s*"([^"]*)"/i);

    const m3uGroupName =
      groupTitleMatch && groupTitleMatch[1]
        ? groupTitleMatch[1].trim()
        : group.nameEn;

    let link = '';

    if (
      lines[i + 1] &&
      !lines[i + 1].startsWith('#')
    ) {
      link = lines[i + 1].trim();
      i++;
    }

    if (!link) continue;

    /*
     * Use a normalized name as the grouping key.
     * This makes:
     *   beIN SPORTS 1 [LOW]
     *   beIN SPORTS 1 [SD]
     *   beIN SPORTS 1 [HD]
     * all belong to one channel.
     */
    const key = baseName
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    if (!grouped.has(key)) {
      grouped.set(key, {
        baseName,
        logo: channelLogo,
        groupTitle: m3uGroupName,
        qualities: [],
        fallbackLink: link
      });
    }

    const item = grouped.get(key);

    if (!item.logo && channelLogo) {
      item.logo = channelLogo;
    }

    /*
     * If a quality is present, store it as a quality option.
     * If no quality suffix exists, keep it as the fallback stream.
     */
    if (parsed.quality) {

      const alreadyExists =
        item.qualities.some(
          q => q.name === parsed.quality
        );

      if (!alreadyExists) {
        item.qualities.push({
          name: parsed.quality,
          url: link
        });
      }

    } else if (!item.fallbackLink) {
      item.fallbackLink = link;
    }
  }

  const channels = [];
  let channelNumber = 0;

  for (const item of grouped.values()) {

    channelNumber++;

    /*
     * Stable quality order.
     */
    item.qualities.sort((a, b) => {
      const ai = QUALITY_ORDER.indexOf(a.name);
      const bi = QUALITY_ORDER.indexOf(b.name);

      return (ai === -1 ? 999 : ai) -
             (bi === -1 ? 999 : bi);
    });

    /*
     * Backward compatibility:
     * old clients still read "link".
     * Prefer HD, then SD, then the first available quality.
     */
    const preferred =
      item.qualities.find(q => q.name === 'HD') ||
      item.qualities.find(q => q.name === 'SD') ||
      item.qualities[0];

    const mainLink =
      preferred
        ? preferred.url
        : item.fallbackLink;

    /*
     * Legacy clients only understand link/link2/link3.
     * Keep those fields populated from the first available
     * quality streams while the new "qualities" array keeps
     * every quality for the updated app.
     */
    const legacyQualityLinks = [];
    if (preferred && preferred.url) {
      legacyQualityLinks.push(preferred.url);
    }

    for (const q of item.qualities) {
      if (
        q.url &&
        !legacyQualityLinks.includes(q.url) &&
        legacyQualityLinks.length < 3
      ) {
        legacyQualityLinks.push(q.url);
      }
    }

    channels.push({

      id: `${groupId}_${channelNumber}`,

      id_sliders: null,

      id_custom_list: null,

      name_en: item.baseName,

      name_ar: item.baseName,

      id_groups: String(groupId),

      groups_name_en: group.nameEn,

      groups_name_ar: group.nameAr,

      groups_main_icon: LOGO,

      groups_sub_icon: LOGO,

      groups_logo: LOGO,

      groups_mobile_logo: LOGO,

      groups_link: '',

      logo: item.logo || LOGO,

      mobile_logo: item.logo || LOGO,

      real_channel_logo: item.logo || LOGO,

      logo_name: item.baseName,

      /*
       * Existing field kept for compatibility.
       * It points to the preferred quality.
       */
      link: mainLink || '',

      link2:
        legacyQualityLinks[1] ||
        legacyQualityLinks[0] ||
        '',

      link3:
        legacyQualityLinks[2] ||
        legacyQualityLinks[1] ||
        legacyQualityLinks[0] ||
        '',

      /*
       * NEW:
       * All actual quality streams belonging to this channel.
       */
      qualities: item.qualities,

      /*
       * Helpful for the app/UI.
       */
      available_qualities:
        item.qualities.map(q => q.name),

      default_quality:
        preferred
          ? preferred.name
          : null,

      group_title: item.groupTitle
    });
  }

  console.log(
    `Group ${groupId} loaded: ${channels.length} grouped channels`
  );

  return channels;
}

/* =========================================
   SUCCESS RESPONSE
========================================= */

function success(data) {

  return {

    api_status: 200,

    api_message: 'success',

    data: data

  };
}


/* =========================================
   GET ALL GROUPS
========================================= */

function getGroups() {

  return Object.entries(GROUPS)
    .map(([id, group]) => {

      return {

        id: id,

        name_en:
          group.nameEn,

        name_ar:
          group.nameAr,


        logo:
          LOGO,

        mobile_logo:
          LOGO,

        main_icon:
          LOGO,

        sub_icon:
          LOGO,


        link: '',

        Maintenance: '0'

      };

    });

}


/* =========================================
   API
========================================= */

module.exports = (req, res) => {

  const url = new URL(
    req.url,
    'https://localhost'
  );


  const pathname =
    url.pathname.replace(
      /\/+$/,
      ''
    ) || '/';


  const groupId =
    url.searchParams.get(
      'id_groups'
    ) ||
    url.searchParams.get(
      'group'
    );


  const channelId =
    url.searchParams.get(
      'id_channel'
    );


  /* =====================================
     HEADERS
  ===================================== */

  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  );

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    '*'
  );

  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate'
  );

  res.setHeader(
    'Content-Type',
    'application/json; charset=utf-8'
  );


  /* =====================================
     OPTIONS
  ===================================== */

  if (req.method === 'OPTIONS') {

    return res
      .status(200)
      .end();

  }


  try {


    /* ===================================
       /api?group=1
       /api?group=2
       /api?group=3
       /api?group=4
       /api?group=5
    =================================== */

    if (
      pathname === '/api' &&
      groupId
    ) {


      if (
        !GROUPS[String(groupId)]
      ) {

        return res
          .status(400)
          .json({

            api_status: 400,

            api_message:
              'Invalid group',

            data: []

          });

      }


      const channels =
        readPlaylist(groupId);


      return res
        .status(200)
        .json(
          success(channels)
        );

    }


    /* ===================================
       /api
       جميع الباقات
    =================================== */

    if (
      pathname === '/api' &&
      !groupId
    ) {


      return res
        .status(200)
        .json(
          success(
            getGroups()
          )
        );

    }


    /* ===================================
       /api/groups
    =================================== */

    if (
      pathname === '/api/groups'
    ) {


      return res
        .status(200)
        .json(
          success(
            getGroups()
          )
        );

    }


    /* ===================================
       /api/channels?group=1
       /api/channels?group=2
    =================================== */

    if (
      pathname === '/api/channels'
    ) {


      const id =
        groupId || '1';


      if (
        !GROUPS[String(id)]
      ) {

        return res
          .status(400)
          .json({

            api_status: 400,

            api_message:
              'Invalid group',

            data: []

          });

      }


      const channels =
        readPlaylist(id);


      return res
        .status(200)
        .json(
          success(channels)
        );

    }


    /* ===================================
       /api/channel?id_channel=2_1
    =================================== */

    if (
      pathname === '/api/channel'
    ) {


      if (!channelId) {

        return res
          .status(200)
          .json(
            success([])
          );

      }


      let channel = null;


      /*
       * ID الجديد:
       *
       * 1_1
       * 1_2
       * 2_1
       * 2_2
       * 3_1
       */

      for (
        const id of Object.keys(GROUPS)
      ) {

        const channels =
          readPlaylist(id);


        const found =
          channels.find(
            x =>
              x.id === channelId
          );


        if (found) {

          channel = found;

          break;

        }

      }


      return res
        .status(200)
        .json(
          success(
            channel
              ? [channel]
              : []
          )
        );

    }


    /* ===================================
       EMPTY ENDPOINTS
    =================================== */

    if (

      pathname === '/api/sliders' ||

      pathname === '/api/slider_items' ||

      pathname === '/api/custom_list' ||

      pathname === '/api/custom_list_items' ||

      pathname === '/api/schedules'

    ) {


      return res
        .status(200)
        .json(
          success([])
        );

    }


    /* ===================================
       NOT FOUND
    =================================== */

    return res
      .status(404)
      .json({

        api_status: 404,

        api_message:
          'Not found',

        data: []

      });


  } catch (error) {


    console.error(
      'API ERROR:',
      error
    );


    return res
      .status(500)
      .json({

        api_status: 500,

        api_message:
          'Server error',

        data: []

      });

  }

};
