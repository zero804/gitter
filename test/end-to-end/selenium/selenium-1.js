var webdriverjs = require("webdriverjs");
var client = webdriverjs.remote({
    host: "beta-internal",
    desiredCapabilities: {
      browserName:"chrome"
    }
  });

client
    .init()
    .url("https://github.com/")
    .getElementSize("id", "header", function(result){ console.log(result);  })
    .getTitle(function(title) { console.log(title); })
    .getElementCssProperty("id", "header", "color", function(result){ console.log(result);  })
    .end();