const fs = require("fs");
const path = require("path");

const GROUPS = {
  "1": {
    name: "BEIN SPORTS SD",
    file: "bein_sports.m3u"
  },
  "2": {
    name: "ALWAN SPORT SD",
    file: "alwan_sport.m3u"
  }
};

function getPlaylist(groupId) {
  const group = GROUPS[groupId];

  if (!group) {
    return null;
  }

  const filePath = path.join(
    process.cwd(),
    "channels",
    group.file
  );

  return fs.readFileSync(filePath, "utf8");
}

module.exports = (req, res) => {
  const group = req.query.group;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache");

  // /api?group=1 أو /api?group=2
  if (group) {
    if (!GROUPS[group]) {
      return res.status(404).json({
        status: "error",
        message: "Invalid group"
      });
    }

    try {
      const playlist = getPlaylist(group);

      res.setHeader(
        "Content-Type",
        "audio/x-mpegurl; charset=utf-8"
      );

      return res.status(200).send(playlist);
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Playlist file not found"
      });
    }
  }

  // /api بدون group
  return res.status(200).json({
    status: "success",
    groups: [
      {
        id: "1",
        name: "BEIN SPORTS SD",
        endpoint: "/api?group=1"
      },
      {
        id: "2",
        name: "ALWAN SPORT SD",
        endpoint: "/api?group=2"
      }
    ]
  });
};
