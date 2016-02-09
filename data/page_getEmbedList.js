'use strict';

let embed_selectors = ['iframe[src*="://www.dailymotion.com/embed/video/"]', 'iframe[src*="://www.hitbox.tv/"]', 'iframe[src*="://player.twitch.tv/?channel"]'];
let embed_list = new Array();
for(selector of embed_selectors){
	let result = document.querySelectorAll(selector);
	if(result.length > 0){
		for(node of result){
			embed_list.push(node.src);
		}
	}
}

function sendDataToMain(){
	this.port = chrome.extension.connect({name: portName});
	this.sendData = function(id, data){
		this.port.postMessage({"id": id, "data": data});
	}
}
let my_port =	new sendDataToMain("Live_Streamer");
let port = my_port.port;

my_port.sendData("addStream", embed_list);
