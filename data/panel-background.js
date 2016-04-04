'use strict';

var backgroundPage = chrome.extension.getBackgroundPage();
var getPreferences = backgroundPage.getPreferences;

backgroundPage.color = function(hexColorCode) {
	let getCodes =  /^#([\da-fA-F]{2,2})([\da-fA-F]{2,2})([\da-fA-F]{2,2})$/;
	if(getCodes.test(hexColorCode)){
		let result = getCodes.exec(hexColorCode);
		this.R= parseInt(result[1],16);
		this.G= parseInt(result[2],16);
		this.B= parseInt(result[3],16);
	}
	this.rgbCode = function(){
		return "rgb(" + this.R + ", " + this.G + ", " + this.B + ")";
	}
	/* RGB to HSL function from https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion/9493060#9493060 */
	this.getHSL = function(){
		let r = this.R;let g = this.G;let b = this.B;
		
		r /= 255, g /= 255, b /= 255;
		var max = Math.max(r, g, b), min = Math.min(r, g, b);
		var h, s, l = (max + min) / 2;

		if(max == min){
			h = s = 0; // achromatic
		}else{
			var d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch(max){
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
			}
			h /= 6;
		}
		return {"H": h * 360, "S": s * 100 + "%", "L": l * 100 + "%"};
	}
}

backgroundPage.theme_cache_update = function(document, data){
	let panel_theme_select;
	
	let panel_theme = data.theme;
	let background_color = data.background_color;
	let panelColorStylesheet = document.querySelector("#panel-color-stylesheet");
	
	if(panelColorStylesheet !== null && panel_theme == panelColorStylesheet.getAttribute("data-theme") && background_color == panelColorStylesheet.getAttribute("data-background_color")){
		console.info("Loaded theme is already good");
		return null;
	} else {
		let theme_cache = backgroundPage.theme_cache;
		if(typeof theme_cache != "undefined" && data.theme == theme_cache.id.theme && data.background_color == theme_cache.id.background_color){
			console.info("Using theme cache");
			return backgroundPage.theme_cache.data;
		} else {
			let baseColor = new color(data.background_color);
			if(typeof baseColor != "object"){return null;}
			panelColorStylesheet = document.createElement("style");
			panelColorStylesheet.id = "panel-color-stylesheet";
			let baseColor_hsl = baseColor.getHSL();
			let baseColor_L = JSON.parse(baseColor_hsl.L.replace("%",""))/100;
			let values;
			if(data.theme == "dark"){
				var textColor_stylesheet = "@import url(css/panel-text-color-white.css);";
				if(baseColor_L > 0.5 || baseColor_L < 0.1){
					values = ["19%","13%","26%","13%"];
				} else {
					values = [(baseColor_L + 0.06) * 100 + "%", baseColor_L * 100 + "%", (baseColor_L + 0.13) * 100 + "%", baseColor_L * 100 + "%"];
				}
			} else if(data.theme == "light"){
				var textColor_stylesheet = "@import url(css/panel-text-color-black.css);";
				if(baseColor_L < 0.5 /*|| baseColor_L > 0.9*/){
					values = ["87%","74%","81%","87%"];
				} else {
					values = [baseColor_L * 100 + "%", (baseColor_L - 0.13) * 100 + "%", (baseColor_L - 0.06) * 100 + "%", baseColor_L * 100 + "%"];
				}
			}
			panelColorStylesheet.textContent = `
${textColor_stylesheet}
body {background-color: hsl(${baseColor_hsl.H}, ${baseColor_hsl.S}, ${values[0]});}
header, footer {background-color: hsl(${baseColor_hsl.H}, ${baseColor_hsl.S}, ${values[1]});}
header button, .item-stream {background-color: hsl(${baseColor_hsl.H}, ${baseColor_hsl.S}, ${values[2]});}
#deleteStreamTooltip {background-color: hsla(${baseColor_hsl.H}, ${baseColor_hsl.S}, ${values[2]}, 0.95);};
header, .item-stream, footer{box-shadow: 0px 0px 5px 0px hsl(${baseColor_hsl.H}, ${baseColor_hsl.S}, ${values[3]});}
			`
			panelColorStylesheet.setAttribute("data-theme", panel_theme);
			panelColorStylesheet.setAttribute("data-background_color", background_color);
			//console.log(baseColor.rgbCode());
			//console.log("hsl(" + baseColor_hsl.H + ", " + baseColor_hsl.S + ", " + baseColor_hsl.L + ")");
			
			backgroundPage.theme_cache = {id: data, data: panelColorStylesheet};
			return panelColorStylesheet;
		}
	}
}

// Build theme cache on addon load
backgroundPage.theme_cache_update(document, {"theme": getPreferences("panel_theme"), "background_color": getPreferences("background_color")});
