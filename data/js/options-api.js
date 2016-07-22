'use strict';

function encodeString(string){
	if(typeof string != "string"){
		console.warn(`encodeString: wrong type (${typeof string})`);
		return string;
	} else {
		// Using a regexp with g flag, in a replace method let it replace all
		string = string.replace(/%/g,"%25");
		string = string.replace(/\:/g,"%3A");
		string = string.replace(/,/g,"%2C");
	}
	return string;
}
function decodeString(string){
	if(typeof string != "string"){
		console.warn(`encodeString: wrong type (${typeof string})`);
		return string;
	} else {
		// Using a regexp with g flag, in a replace method let it replace all
		string = string.replace(/%3A/g,":");
		string = string.replace(/%2C/g,",");
		string = string.replace(/%25/g,"%");
	}
	return string;
}

function getFilterListFromPreference(string){
	let list = string.split(",");
	for(let i in list){
		if(list[i].length == 0){
			delete list[i];
			// Keep a null item, but this null is not considered in for..in loops
		} else {
			list[i] = decodeString(list[i]);
		}
	}
	return list;
}

function getPreference(prefId){
	let defaultSettings = options_default;
	if(typeof localStorage.getItem(prefId) != "undefined" && localStorage.getItem(prefId) != null){
		let current_pref = localStorage.getItem(prefId);
		switch(typeof defaultSettings[prefId]){
			case "string":
				return current_pref;
				break;
			case "number":
				return parseInt(current_pref);
				break;
			case "boolean":
				return getBooleanFromVar(current_pref);
			case "undefined":
				console.warn(`The setting ${prefId} has no default value: ${typeof defaultSettings[prefId]}`);
				return current_pref;
				break;
			default:
				console.warn(`Unknown default type for the setting ${prefId}: ${typeof defaultSettings[prefId]}`);
				return current_pref;
		}
	} else if(typeof defaultSettings[prefId] != "undefined"){
		console.warn(`Preference ${prefId} not found, using default`);
		savePreference(prefId, defaultSettings[prefId]);
		return defaultSettings[prefId];
	}
}
function getSyncPreferences(){
	let obj = {};
	for(let prefId in options){
		let option = options[prefId];
		if(option.hasOwnProperty("sync") == true && option.sync == false){
			continue;
		} else if(option.type == "control" || option.type == "file"){
			continue;
		} else {
			obj[prefId] = getPreference(prefId);
		}
	}
	return obj;
}
function savePreference(prefId, value){
	localStorage.setItem(prefId, value);
}
function getBooleanFromVar(string){
	switch(typeof string){
		case "boolean":
			return string;
			break;
		case "number":
		case "string":
			if(string == "true" || string == "on" || string == 1){
				return true;
			} else if(string == "false" || string == "off" || string == 0){
				return false;
			} else {
				console.warn(`getBooleanFromVar: Unkown boolean (${string})`);
				return string;
			}
			break;
		default:
			console.warn(`getBooleanFromVar: Unknown type to make boolean (${typeof string})`);
	}
}
function translateNodes(locale_document){
	let _ = chrome.i18n.getMessage;
	let document = locale_document;
	let translate_nodes = document.querySelectorAll("[data-translate-id]");
	for(let i in translate_nodes){
		let node = translate_nodes[i];
		if(typeof node.tagName == "string"){
			node.textContent = _(node.dataset.translateId);
		}
	}
}
function translateNodes_title(locale_document){
	let _ = chrome.i18n.getMessage;
	let document = locale_document;
	let translate_nodes = document.querySelectorAll("[data-translate-title]");
	for(let i in translate_nodes){
		let node = translate_nodes[i];
		if(typeof node.tagName == "string"){
			node.title = _(node.dataset.translateTitle);
		}
	}
}
function getValueFromNode(node){
	let tagName = node.tagName.toLowerCase();
	if(tagName == "textarea"){
		if(node.dataset.stringTextarea == "true"){
			return node.value.replace(/\n/g, "");
		} else if(node.dataset.stringList == "true"){
			let list = node.value.split("\n");
			for(let i in list){
				list[i] = encodeString(list[i]);
			}
			return list.join(",");
		} else {
			return node.value;
		}
	} else if(node.type == "checkbox") {
		return node.checked;
	} else if(tagName == "input" && node.type == "number"){
		return parseInt(node.value);
	} else if(typeof node.value == "string"){
		return node.value;
	} else {
		console.error("Problem with node trying to get value");
	}
}

function settingNode_onChange(event){
	let node = event.target;
	let settingName = node.id;
	let settingValue = getValueFromNode(node);
	
	savePreference(settingName, settingValue);
	
	if(typeof refreshSettings == "function"){
		refreshSettings(event);
	}
}

function simulateClick(node) {
	let evt = new MouseEvent("click", {
		bubbles: true,
		cancelable: true,
		view: window,
	});
	// Return true is the event haven't been canceled
	return node.dispatchEvent(evt);
}
function exportPrefsToFile(){
	let preferences = getSyncPreferences();
	
	let exportData = {
		"live_notifier_version": appGlobal["version"],
		"preferences": preferences
	}
	
	let link = document.createElement("a");
	link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData));
	link.download = "live_notifier_preferences.json";
	
	simulateClick(link);
}
function importPrefsFromFile(event){
	let node = document.createElement("input");
	node.type = "file";
	node.addEventListener("change", function(){
		let fileLoader=new FileReader();
		if(node.files.length == 0 || node.files.length > 1){
			console.warn(`[Input error] ${node.files.length} file(s) selected `);
		} else {
			fileLoader.readAsText(node.files[0]);
			fileLoader.onloadend = function(event){
				let rawFileData = event.target.result;
				let file_JSONData = null;
				try{
					file_JSONData = JSON.parse(rawFileData);
				}
				catch(error){
					if(new String(error).indexOf("SyntaxError") != -1){
						console.warn(`An error occurred when trying to parse file (Check the file you have used)`);
					} else {
						console.warn(`An error occurred when trying to parse file (${error})`);
					}
				}
				if(file_JSONData != null){
					if(file_JSONData.hasOwnProperty("live_notifier_version") == true && file_JSONData.hasOwnProperty("preferences") == true && typeof file_JSONData.preferences == "object"){
						for(let prefId in file_JSONData.preferences){
							if(typeof options[prefId].type != "undefined" && options[prefId].type != "control" && options[prefId].type != "file" && typeof file_JSONData.preferences[prefId] == typeof options_default_sync[prefId]){
								savePreference(prefId, file_JSONData.preferences[prefId]);
								let prefNode = document.querySelector(`#${prefId}.preferenceInput`);
								if(prefNode != null){
									let settingType = prefNode.dataset.settingType;
									switch(settingType){
										case "string":
										case "color":
										case "menulist":
											prefNode.value = file_JSONData.preferences[prefId];
											break;
										case "integer":
											prefNode.value = parseInt(file_JSONData.preferences[prefId]);
											break;
										case "bool":
											prefNode.checked = getBooleanFromVar(file_JSONData.preferences[prefId]);
											break;
										case "control":
										case "file":
											// Nothing to update, no value
											break;
									}
								}
							} else {
								console.warn(`Error trying to import ${prefId}`);
							}
						}
						sendDataToMain("refreshStreams","");
					}
				}
			}
		}
	});
	simulateClick(node);
}
