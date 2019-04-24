function getVideoId (url) {
	var pattern = /(?:v=|\/)([0-9A-Za-z_-]{11}).*/;
	var matches = pattern.exec(url);
	//console.log(matches);
	return matches;
}

function urldecode(url) {
	if (url) {
		return decodeURIComponent(url.replace(/\+/g, ' '));
	} else {
		return ' ';
	}
}

function printDownloadUrls (videoInfo) {
	var titlePattern = /%22title%22%3A%22(.*?)%22/gm;
	var title = titlePattern.exec(videoInfo);
	document.getElementById("video_title").innerHTML = "Title: " + urldecode(title[1]);
	
	var pattern = /(?:"itag":([0-9]*),"url":"(.*?)","mimeType":"(.*?)","bitrate":([0-9]*),)(?:"width":([0-9]*),"height":([0-9]*))?/gm;
	//first narrow down sections of videoInfo, use group 1
	var muxedPattern = /url_encoded_fmt_stream_map=(.*?)(?:&|$)/gm;
	var adaptivePattern = /adaptive_fmts=(.*?)(?:&|$)/gm;
	
	//This gets all of the raw data for one video in group 1
	var videoPattern = /(.*?)(?:,|$)/gm;
	
	//This gets the next parameter, name in group 1 and value in group 2
	var paramsPattern = /(.+?)=(.*?)(&|$)/gm;
	
	var muxedData = muxedPattern.exec(videoInfo);
	muxedData[1] = urldecode(muxedData[1]);
	console.log(muxedData[1]);
	var adaptiveData = adaptivePattern.exec(videoInfo);
	adaptiveData[1] = urldecode(adaptiveData[1]);
	console.log(adaptiveData[1]);
	
	var m;
	
	//array of objects that will hold values for table
	var tableData = [];
	var rowCount = 0;
	
	while ((m = videoPattern.exec(muxedData[1])) !== null) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (m.index === videoPattern.lastIndex) {
			videoPattern.lastIndex++;
			continue;
		}
		tableData[rowCount] = new Map();
		m.forEach((match, groupIndex) => {
			console.log(`Found match, group ${groupIndex}: ${match}`);
			//get the raw chunk data from each video stream, parse each chunk for information and write the info to the page
			//the data for each paramater is still url encoded
			if (groupIndex == 1) {
				while ((m1 = paramsPattern.exec(match)) !== null) {
					// This is necessary to avoid infinite loops with zero-width matches
					if (m1.index === paramsPattern.lastIndex) {
						paramsPattern.lastIndex++;
					}
					
					m1.forEach((match1, groupIndex1) => {
						console.log(`Found match, group ${groupIndex1}: ${match1}`);
						if (groupIndex1 == 1 && match1 != "") {
							tableData[rowCount].set(match1, m1[groupIndex1 + 1]);
						}
					});
				}
			}
		});
		rowCount++;
	}
	while ((m = videoPattern.exec(adaptiveData[1])) !== null) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (m.index === videoPattern.lastIndex) {
			videoPattern.lastIndex++;
			continue;
		}
		tableData[rowCount] = new Map();
		m.forEach((match, groupIndex) => {
			console.log(`Found match, group ${groupIndex}: ${match}`);
			//get the raw chunk data from each video stream, parse each chunk for information and write the info to the page
			//the data for each paramater is still url encoded
			if (groupIndex == 1) {
				while ((m1 = paramsPattern.exec(match)) !== null) {
					// This is necessary to avoid infinite loops with zero-width matches
					if (m1.index === paramsPattern.lastIndex) {
						paramsPattern.lastIndex++;
					}
					
					m1.forEach((match1, groupIndex1) => {
						console.log(`(adaptive)Found match, group ${groupIndex1}: ${match1}`);
						if (groupIndex1 == 1 && match1 != "") {
							tableData[rowCount].set(match1, m1[groupIndex1 + 1]);
						}
					});
				}
			}
		});
		rowCount++;
	}
	console.log(tableData);
	
	//tableData is an array of maps, each map holds information about one stream
	//each element of tableData corresponds to a row in the table
	var table = document.getElementById("tb");
	//Headings: Download Link, File Type, Resolution, FPS, Bitrate, Audio Sample Rate
	for (var i = 0; i < tableData.length; i++) {
		var row = table.insertRow(-1);
		//Download Link
		var cell = row.insertCell(-1);
		var aTag = document.createElement('a');
		aTag.setAttribute('href', urldecode(tableData[i].get("url")));
		aTag.setAttribute('class', 'downloadUrl');
		aTag.setAttribute('target', '_blank');
		aTag.innerHTML = "Click to preview. Right click and 'Save link as...' to download.";
		cell.appendChild(aTag);
		//File Type
		cell = row.insertCell(-1);
		cell.innerHTML = urldecode(tableData[i].get("type"));
		//Resolution
		cell = row.insertCell(-1);
		cell.innerHTML = urldecode(tableData[i].get("size"));
		//FPS
		cell = row.insertCell(-1);
		cell.innerHTML = urldecode(tableData[i].get("fps"));
		//Bitrate
		cell = row.insertCell(-1);
		cell.innerHTML = urldecode(tableData[i].get("bitrate"));
		//Audio Sample Rate
		cell = row.insertCell(-1);
		cell.innerHTML = urldecode(tableData[i].get("audio_sample_rate"));
	}
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
			console.log(`Found match, group ${groupIndex}: ${match}`);
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
                url: "https://cors-anywhere.herokuapp.com/" + stsUrl,
                //dataType: 'json',
		timeout: '10000',
		error: function(jqXHR, textStatus, errorThrown) {
                        if(textStatus==="timeout") {
                                document.getElementById("message").innerHTML = "Connection timeout.";
                        } else {
                                document.getElementById("message").innerHTML = "Connection failure.";
                        }
                },
                success: function(data) {
                        videoInfo = data;
                        console.log(videoInfo);
                        //figure out if videoInfo is any good
                        var pattern = /reason%22%3A/;
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
                url: "https://cors-anywhere.herokuapp.com/" + embedUrl,
                //dataType: 'json',
		timeout: '10000',
		error: function(jqXHR, textStatus, errorThrown) {
                        if(textStatus==="timeout") {
                                document.getElementById("message").innerHTML = "Connection timeout.";
                        } else {
                                document.getElementById("message").innerHTML = "Connection failure.";
                        }
                },
                success: function(data) {
                        videoInfo = data;
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
  		url: "https://cors-anywhere.herokuapp.com/" + videoInfoUrl,
  		//dataType: 'json',
		timeout: '10000',
		error: function(jqXHR, textStatus, errorThrown) {
        		if(textStatus==="timeout") {
           			document.getElementById("message").innerHTML = "Connection timeout.";
        		} else {
				document.getElementById("message").innerHTML = textStatus;
			}
    		},	
  		success: function(data) {
    			videoInfo = data;
			console.log(videoInfo);
			//figure out if videoInfo is any good
			var pattern = /reason%22%3A/;
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
		//calls a chain of ajax request callbacks and ends up printing all` the links
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

