var http = require('http');
var fs = require('fs');

var data = "";

var request = http.get("url", function(response) {
  response.on('data', function (chunk) {
    data += chunk;
  });
  
  response.on('end', function() {
    
    // line by line
    var lines = data.split("\n");
    
    for(var i = 0; i < lines.length; i++)
    {
        var line = lines[i];
        
        var fields = line.split(",");
        
        if(4 === fields.length )
        {
          // now we have a fields
          console.log(line);
        }
    }
    
  });
    
});