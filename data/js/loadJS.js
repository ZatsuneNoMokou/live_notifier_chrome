function loadJS(prefix, list, callback){
	if(typeof callback == "undefined"){
		callback = null;
	}
	if(list.hasOwnProperty(length) == true && list.length > 0){
		
		let currentScripts = document.scripts;
		for(let i in currentScripts){
			if(typeof currentScripts[i].src == "string" && currentScripts[i].src.indexOf(list[0]) != -1){
				console.log(`"${list[0]}" is already loaded`);
				list.shift();
				loadJS(list, callback);
				return false;
			}
		}
		let reg = /^.*\/$/;
		
		let newJS = document.createElement("script");
		newJS.src = prefix + ((reg.test(prefix))? "" : "/") + list[0];
		newJS.onload = function(){
			newJS.onload = null;
			list.shift();
			loadJS(prefix, list, callback);
		};
		document.querySelector("body").appendChild(newJS);
		return true;
	} else if(callback != null){
		callback();
	}
}
