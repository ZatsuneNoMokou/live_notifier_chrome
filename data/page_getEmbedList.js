'use strict';

var embed_selectors = ['iframe[src*="://www.dailymotion.com/embed/video/"]', 'iframe[src*="://www.hitbox.tv/"]', 'iframe[src*="://player.twitch.tv/?channel"]'];

var embed_list = new Array();
for(let i in embed_selectors){
	let selector = embed_selectors[i];
	let result = document.querySelectorAll(selector);
	if(result.length > 0){
		for(let j in result){
			let node = result[j];
			embed_list.push(node.src);
		}
	}
}

function sendDataToMain(portName){
	this.port = chrome.extension.connect({name: portName});
	this.sendData = function(id, data){
		this.port.postMessage({"id": id, "data": data});
	}
}
var my_port =	new sendDataToMain("Live_Streamer_Embed");
var port = my_port.port;

my_port.sendData("addStream", embed_list);
