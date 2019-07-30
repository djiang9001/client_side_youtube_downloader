function getVideoId (url) {
	var pattern = /(?:v=|\/)([0-9A-Za-z_-]{11}).*/;
	var matches = pattern.exec(url);
	//console.log(matches);
	return matches;
}

function urldecode (url) {
	if (url) {
		return decodeURIComponent(url.replace(/\+/g, ' '));
	} else {
		return ' ';
	}
}

function updateTable (tableData) {
	var table = document.getElementById("tb");
	//delete all non-header rows
	for(var i = table.rows.length - 1; i >= 0; i--)
	{
		table.deleteRow(i);
	}
	//Headings: Download Link, File Type, Resolution, FPS, Bitrate, Audio Sample Rate
	for (var i = 0; i < tableData.length; i++) {
		var row = table.insertRow(-1);
		//Download Link
		var cell = row.insertCell(-1);
		var aTag = document.createElement('a');
		console.log(tableData[i].get("url"));
		aTag.setAttribute('href', "https://cors-proxy-9001.herokuapp.com/" + urldecode(tableData[i].get("url")));
		aTag.setAttribute('class', 'downloadUrl');
		aTag.setAttribute('target', '_blank');
		aTag.innerHTML = "Click to preview. Right click and 'Save link as...' to download.";
		cell.appendChild(aTag);
		//File Type
		cell = row.insertCell(-1);
		cell.innerHTML = urldecode(tableData[i].get("type"));
		//Resolution
		cell = row.insertCell(-1);
		//muxed streams don't have size, they have quality
		/*
		console.log("tableData dump");
		console.log(tableData);
		console.log(tableData[i].has("size"));
		console.log(tableData[i].get("size"));
		console.log(tableData[i].get("quality"));
		*/
		if (tableData[i].has("size")) {
			cell.innerHTML = urldecode(tableData[i].get("size"));
		} else {
			var rawParam = urldecode(tableData[i].get("quality"));
			if (rawParam == "hd1080") {
				cell.innerHTML = urldecode(tableData[i].get("quality")) + "; 1920x1080";
			} else if (rawParam == "hd720") {
				cell.innerHTML = urldecode(tableData[i].get("quality")) + "; 1280x720";
			} else if (rawParam == "large") {
				cell.innerHTML = urldecode(tableData[i].get("quality")) + "; 858x480";
			} else if (rawParam == "medium") {
				cell.innerHTML = urldecode(tableData[i].get("quality")) + "; 640x360";
			} else if (rawParam == "small") {
				cell.innerHTML = urldecode(tableData[i].get("quality")) + "; 352x240";
			} else {
				cell.innerHTML = urldecode(tableData[i].get("quality"));
			}
		}
		
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
		document.getElementById("message").innerHTML = "Download links retrieved.";
}

function decodeSignatures (tableData, videoId) {
	var watchUrl = "https://youtube.com/watch?=" + videoId;
	$.ajax({
        url: "https://cors-proxy-9001.herokuapp.com/" + watchUrl,
		
		timeout: '10000',
		error: 
			function(jqXHR, textStatus, errorThrown) {
				if(textStatus==="timeout") {
                    document.getElementById("message").innerHTML = "Connection timeout.";
                } else {
                    document.getElementById("message").innerHTML = "Connection failure.";
                }
            },
        success:
			function(data) {
				console.log(data);
                var htmlInfo = data;
				var pattern = /"PLAYER_JS_URL":"(.*?base.js)/;
				var match = pattern.exec(htmlInfo);
				if (match != null) {
					var jsUrl = "https://youtube.com" + match[1].replace("\\", "");
				} else {
					document.getElementById("message").innerHTML = "base.js not found, cannot decipher signatures.";
				}
				//another ajax to get the decryptor function
				$.ajax({
					url: "https://cors-proxy-9001.herokuapp.com/" + jsUrl,
					timeout: '10000',
					error: 
						function(jqXHR, textStatus, errorThrown) {
							if(textStatus==="timeout") {
								document.getElementById("message").innerHTML = "Connection timeout.";
							} else {
								document.getElementById("message").innerHTML = "Connection failure.";
							}
						},
					success:
						function(data) {
							var rawJs = data;
							console.log(data);
							//first find decryptor function
							var matches = null;
							var patterns = [];
							//possible patterns for finding the initial function name
							
							patterns[0] = /\b[cs]\s*&&\s*[adf]\.set\([^,]+\s*,\s*encodeURIComponent\s*\(\s*([a-zA-Z0-9$]+)\(/
							patterns[1] = /\b[a-zA-Z0-9]+\s*&&\s*[a-zA-Z0-9]+\.set\([^,]+\s*,\s*encodeURIComponent\s*\(\s*([a-zA-Z0-9$]+)\(/
							patterns[2] = /([a-zA-Z0-9$]+)\s*=\s*function\(\s*a\s*\)\s*{\s*a\s*=\s*a\.split\(\s*""\s*\)/
							//old patterns, will only search these if the first ones fail
							patterns[3] = /yt\.akamaized\.net\/\)\s*\|\|\s*.*?\s*c\s*&&\s*d\.set\([^,]+\s*,\s*(?:encodeURIComponent\s*\()?([a-zA-Z0-9$]+)\(/;
							patterns[4] = /\bc\s*&&\s*d\.set\([^,]+\s*,\s*(?:encodeURIComponent\s*\()?\s*([a-zA-Z0-9$]+)\(/;
							patterns[5] = /([\"\'])signature\1\s*,\s*([a-zA-Z0-9$]+)\(/;
							patterns[6] = /\.sig\|\|([a-zA-Z0-9$]+)\(/;
							patterns[7] = /\bc\s*&&\s*d\.set\([^,]+\s*,\s*\([^)]*\)\s*\(\s*([a-zA-Z0-9$]+)\(/;
							
							for (var i = 0; i < patterns.length; i++) {
								matches = patterns[i].exec(rawJs);
								if (matches != null) {
									break;
								}
							}
							console.log(matches[1]);
							if (matches == null) {
								document.getElementById("message").innerHTML = "cannot find initial signature function";
							}
							//add a line of js to the end that runs the function
							rawJs = rawJs.replace(/}\)\(_yt_player\);/, "return " + matches[1] + "\(\);}\)\(_yt_player\);");
							console.log(rawJs);
							//now loop through all signature protected streams and replace "));})(_yt_player);" ""signature");})(_yt_player);"
							var regex = new RegExp(matches[1] + "\\(.*?_yt_player\\);","gm");
							//console.log(regex);
							for (var i = 0; i < tableData.length; i++) {
								if (tableData[i].get("sp")) {
									if (tableData[i].get("sp") == "sig") {
										tableData[i].set("s", urldecode(tableData[i].get("s")));
									}
									rawJs = rawJs.replace(regex, matches[1] + "\(\"" + tableData[i].get("s") + "\"\);}\)\(_yt_player\);");
									//console.log(rawJs);
									var newSig = eval(rawJs);
									console.log(tableData[i].get("s"));
									console.log(newSig);
									tableData[i].set("url", tableData[i].get("url").concat("&" + tableData[i].get("sp") + "=" + newSig));
									//console.log(tableData[i].get("url"));
								}
							}
							//now update table
							updateTable(tableData);
						}
				});
			}
	});
}

function checkSignatures (tableData, videoId) {
	for (var i = 0; i < tableData.length; i++) {
		if (tableData[i].get("sp")) {
			console.log("Link " + i + " is signature protected.");
			decodeSignatures(tableData, videoId);
			return;
		}
	}
	updateTable(tableData);
}
function prepareTableData (videoInfo, videoId) {
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
	document.getElementById("message").innerHTML = "Please wait...";
	checkSignatures(tableData, videoId);
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
        url: "https://cors-proxy-9001.herokuapp.com/" + stsUrl,
		
		timeout: '10000',
		error: 
			function(jqXHR, textStatus, errorThrown) {
				if(textStatus==="timeout") {
					document.getElementById("message").innerHTML = "Connection timeout.";
					} else {
						document.getElementById("message").innerHTML = "Connection failure.";
						}
					},
        success: 
			function(data) {
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
					prepareTableData(videoInfo, videoId);
				}
			}
    });
}

function getVideoInfo2 (videoId) {
	var embedUrl = "https://youtube.com/embed/" + videoId;
	var videoInfo = "";
	$.ajax({
        url: "https://cors-proxy-9001.herokuapp.com/" + embedUrl,
		
		timeout: '10000',
		error: 
			function(jqXHR, textStatus, errorThrown) {
				if(textStatus==="timeout") {
                    document.getElementById("message").innerHTML = "Connection timeout.";
                } else {
                    document.getElementById("message").innerHTML = "Connection failure.";
                }
            },
        success:
			function(data) {
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
  		url: "https://cors-proxy-9001.herokuapp.com/" + videoInfoUrl,
		
		timeout: '10000',
		error: 
			function(jqXHR, textStatus, errorThrown) {
        		if(textStatus==="timeout") {
           			document.getElementById("message").innerHTML = "Connection timeout.";
        		} else {
					document.getElementById("message").innerHTML = textStatus;
				}
    		},	
  		success: 
			function(data) {
				videoInfo = data;
				console.log(videoInfo);
				//figure out if videoInfo is any good
				var pattern = /reason%22%3A/;
				if(pattern.test(videoInfo)) {
					//try the second way
					getVideoInfo2(videoId);
				} else {
					//print all the download urls
					prepareTableData(videoInfo, videoId);
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

