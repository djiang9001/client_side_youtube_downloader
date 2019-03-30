function getVideoId (url) {
	var pattern = /(?:v=|\/)([0-9A-Za-z_-]{11}).*/;
	var matches = pattern.exec(url);
	//console.log(matches);
	return matches;
}

function urldecode(url) {
  return decodeURIComponent(url.replace(/\+/g, ' '));
}

function printDownloadUrls (videoInfo) {

	var pattern = /(?:"itag":([0-9]*),"url":"(.*?)","mimeType":"(.*?)","bitrate":([0-9]*),)(?:"width":([0-9]*),"height":([0-9]*))?/gm;
	var m;

	while ((m = pattern.exec(videoInfo)) !== null) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (m.index === pattern.lastIndex) {
			pattern.lastIndex++;
		}
		console.log(m);
		//for each url full match, we parse out the relevant info
		
		var table = document.getElementById("tb");
		var row = table.insertRow(-1);
		m.forEach((match, groupIndex) => {
			//console.log(`Found match, group ${groupIndex}: ${match}`);
			if (match != null && groupIndex > 1) {
				var cell = row.insertCell(-1);
				if (groupIndex == 2) {
					match = match.replace(/\\u0026/g, '&');
					var aTag = document.createElement('a');
					aTag.setAttribute('href', match);
					aTag.setAttribute('class', 'downloadUrl');
					aTag.setAttribute('target', '_blank');
					aTag.setAttribute('download', 'videoplayback.mp4');
					aTag.innerHTML = "Click to preview. Right click and 'Save link as...' to download.";
					cell.appendChild(aTag);
				} else {
					cell.innerHTML = match;
				}
			}
		});
	}
	//console.log(m);
}

function getSTS (videoInfo) {
	var stsPattern = /(?:"sts":([0-9]*))/;
	var matches = stsPattern.exec(videoInfo);
	//console.log(videoInfo);
	//console.log(matches);
	return matches;
}

function useSTS(sts, videoId) {
	stsUrl = "https://youtube.com/get_video_info?video_id=" + videoId + "&eurl=https://youtube.googleapis.com/v/" + videoId + "&sts=" + sts;
	console.log(stsUrl);
	$.ajax({
                url: 'http://www.whateverorigin.org/get?url=' + encodeURIComponent(stsUrl) + '&callback=?',
                dataType: 'json',
		timeout: '10000',
		error: function(jqXHR, textStatus, errorThrown) {
                        if(textStatus==="timeout") {
                                document.getElementById("message").innerHTML = "Connection timeout.";
                        } else {
                                document.getElementById("message").innerHTML = "Connection failure.";
                        }
                },
                success: function(data) {
                        videoInfo = urldecode(data.contents);
                        console.log(videoInfo);
                        //figure out if videoInfo is any good
                        var pattern = /reason=/;
                        if(pattern.test(videoInfo)) {
                                //video either doesn't exist, is region restricted, or is flagged as offensive
				//console.log("video unavailable");
				document.getElementById("message").innerHTML = "Video unavailable.";
                        } else {
                                //print all the download urls
                                printDownloadUrls(videoInfo);
                        }
                }
        });

}

function getVideoInfo2 (videoId) {
	var embedUrl = "https://youtube.com/embed/" + videoId;
	var videoInfo = "";
	$.ajax({
                url: 'http://www.whateverorigin.org/get?url=' + encodeURIComponent(embedUrl) + '&callback=?',
                dataType: 'json',
		timeout: '10000',
		error: function(jqXHR, textStatus, errorThrown) {
                        if(textStatus==="timeout") {
                                document.getElementById("message").innerHTML = "Connection timeout.";
                        } else {
                                document.getElementById("message").innerHTML = "Connection failure.";
                        }
                },
                success: function(data) {
                        videoInfo = data.contents;
			//we need to get the sts from videoInfo
			var sts = getSTS(videoInfo);
			if (sts) {
				sts = sts[1];
				useSTS(sts, videoId);
			} else {
				document.getElementById("message").innerHTML = "Video unavailable.";
			}
                }
        });

}

function getVideoInfo (videoId) {

	var videoInfoUrl = "https://youtube.com/get_video_info?video_id=" + videoId + "&el=detailpage&hl=en";
	var videoInfo = "";
	$.ajax({
  		url: 'http://www.whateverorigin.org/get?url=' + encodeURIComponent(videoInfoUrl) + '&callback=?',
  		dataType: 'json',
		timeout: '10000',
		error: function(jqXHR, textStatus, errorThrown) {
        		if(textStatus==="timeout") {
           			document.getElementById("message").innerHTML = "Connection timeout.";
        		} else {
				document.getElementById("message").innerHTML = "Connection failure.";
			}
    		},	
  		success: function(data) {
    			videoInfo = urldecode(data.contents);
			console.log(videoInfo);
			//figure out if videoInfo is any good
			var pattern = /reason=/;
			if(pattern.test(videoInfo)) {
				//try the second way
				getVideoInfo2(videoId);
			} else {
				//print all the download urls
				printDownloadUrls(videoInfo);
			}
  		}
	});
}

function showDownloadLinks () {
	//clear table and message
	var toReset = document.getElementsByClassName("resets");

	[].forEach.call(toReset, function(element) {
		element.innerHTML = "";
	});
        //gets and shows user input
        var input = document.getElementById("url_form");
        var inputUrl = input.elements[0].value;
        document.getElementById("user_input").innerHTML = "Your input: " + inputUrl + "<br>";

        //extract the youtubeid from input, handle invalid input
        var videoId = getVideoId(inputUrl);
	if (videoId) {
		videoId = videoId[1];
		document.getElementById("video_id").innerHTML = "Video ID: " + videoId + "<br>";
		//calls a chain of ajax request callbacks and ends up printing all the links
	        getVideoInfo(videoId);
	} else {
		document.getElementById("message").innerHTML = "Invalid video ID.<br>";
	}
	
}

function stopDefault(e) {
	e.preventDefault();
	return false;
}


window.addEventListener("DOMContentLoaded", function(event) {
	document.getElementById("url_form").addEventListener("submit", stopDefault);
	document.getElementById("url_form").addEventListener("submit", showDownloadLinks);
	//window.alert("Button listener added.");
});

