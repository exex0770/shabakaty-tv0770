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

  if (!group) {
    return [];
  }

  const filePath = path.join(
    process.cwd(),
    'channels',
    group.file
  );

  console.log('Reading group:', groupId);
  console.log('File:', group.file);
  console.log('Path:', filePath);

  if (!fs.existsSync(filePath)) {

    console.error(
      'M3U FILE NOT FOUND:',
      filePath
    );

    return [];
  }

  let text;

  try {

    text = fs.readFileSync(
      filePath,
      'utf8'
    );

  } catch (error) {

    console.error(
      'READ FILE ERROR:',
      error
    );

    return [];
  }


  // إزالة BOM
  text = text.replace(/^\uFEFF/, '');


  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);


  const channels = [];

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {

    const line = lines[i];

    if (
      !line.toUpperCase().startsWith('#EXTINF')
    ) {
      continue;
    }


    const info = line;


    /* =========================
       CHANNEL NAME
    ========================= */

    const nameMatch =
      info.match(/,(.*)$/);

    let name =
      nameMatch
        ? nameMatch[1].trim()
        : `Channel ${channels.length + 1}`;


    if (!name) {
      name =
        `Channel ${channels.length + 1}`;
    }


    /* =========================
       LOGO
    ========================= */

    const logoMatch =
      info.match(
        /tvg-logo\s*=\s*"([^"]*)"/i
      );

    const channelLogo =
      logoMatch &&
      logoMatch[1]
        ? logoMatch[1].trim()
        : LOGO;


    /* =========================
       GROUP TITLE
    ========================= */

    const groupTitleMatch =
      info.match(
        /group-title\s*=\s*"([^"]*)"/i
      );

    const m3uGroupName =
      groupTitleMatch &&
      groupTitleMatch[1]
        ? groupTitleMatch[1].trim()
        : group.nameEn;


    /* =========================
       STREAM URL
    ========================= */

    let link = '';

    if (
      lines[i + 1] &&
      !lines[i + 1].startsWith('#')
    ) {

      link = lines[i + 1].trim();

      i++;
    }


    /* =========================
       IGNORE EMPTY LINKS
    ========================= */

    if (!link) {

      console.warn(
        'Channel without stream:',
        name
      );

    }


    /* =========================
       UNIQUE CHANNEL ID
    ========================= */

    const channelNumber =
      channels.length + 1;

    const channelId =
      `${groupId}_${channelNumber}`;


    /* =========================
       CHANNEL OBJECT
    ========================= */

    channels.push({

      id: channelId,

      id_sliders: null,

      id_custom_list: null,


      name_en: name,

      name_ar: name,


      id_groups:
        String(groupId),


      groups_name_en:
        group.nameEn,

      groups_name_ar:
        group.nameAr,


      groups_main_icon:
        LOGO,

      groups_sub_icon:
        LOGO,

      groups_logo:
        LOGO,

      groups_mobile_logo:
        LOGO,


      groups_link: '',


      logo:
        channelLogo,

      mobile_logo:
        channelLogo,

      real_channel_logo:
        channelLogo,


      logo_name:
        name,


      link:
        link,

      link2: '',

      link3: '',


      // إضافية
      group_title:
        m3uGroupName

    });
  }


  console.log(
    `Group ${groupId} loaded: ${channels.length} channels`
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
