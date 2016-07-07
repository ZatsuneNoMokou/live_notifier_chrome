websites.hitbox = {
	"API":
		function(id){
			let obj = {
				url: `https://api.hitbox.tv/media/live/${id}`,
				overrideMimeType: "text/plain; charset=utf-8"
			}
			return obj;
		},
	"importAPI":
		function(id){
			let obj = {
				url: `https://api.hitbox.tv/following/user?user_name=${id}`,
				overrideMimeType: "text/plain; charset=utf-8"
			}
			return obj;
		},
	"isValidResponse":
		function(data){
			if(data.error == "live"){
				return "error";
			}
			if(data.error == true){
				return "error";
			}
			return "success";
		},
	"checkLiveStatus":
		function(id, contentId, data){
			let streamData = liveStatus["hitbox"][id][contentId];
			if(data.hasOwnProperty("livestream") == false){
				if(data.error_msg="no_media_found"){
					streamData.online = false;
				}
				streamData.streamName = id;
				return null;
			}
			if(typeof data["livestream"][0] == "object"){
				data = data["livestream"][0];
				streamData.streamName = data["media_user_name"];
				streamData.streamStatus = data["media_status"];
				if(typeof data["category_name"] == "string" && data["category_name"] != ""){
					streamData.streamGame = data["category_name"];
				}
				if(data["category_logo_large"] !== null){
					streamData.streamCategoryLogo = "http://edge.sf.hitbox.tv" + data["category_logo_large"];
				} else if(data["category_logo_small"] !== null){
					streamData.streamCategoryLogo = "http://edge.sf.hitbox.tv" + data["category_logo_small"];
				} else {
					streamData.streamCategoryLogo = "";
				}
				if(streamData.streamCategoryLogo = "http://edge.sf.hitbox.tv/static/img/generic/blank.gif"){
					streamData.streamCategoryLogo = "";
				}
				
				if(typeof data.channel["user_logo"] == "string" && data.channel["user_logo"].indexOf("/static/img/generic/default-user-") == -1){
					streamData.streamOwnerLogo = "http://edge.sf.hitbox.tv" + data.channel["user_logo"];
				} else if(typeof data.channel["user_logo"] !== "string" && data.channel["user_logo"].indexOf("/static/img/generic/default-user-") == -1){
					streamData.streamOwnerLogo = "http://edge.sf.hitbox.tv" + data.channel["user_logo_small"];
				} else {
					streamData.streamOwnerLogo = "";
				}
				if(typeof data.channel["channel_link"] == "string" && data.channel["channel_link"] != ""){
					streamData.streamURL = data.channel["channel_link"];
				}
				streamData.streamCurrentViewers = parseInt(data["media_views"]);
				
				streamData.online = (data["media_is_live"] == "1")? true : false;
				if(typeof data.channel["twitter_account"] == "string" && data.channel["twitter_account"] != "" && typeof data.channel["twitter_account"] == "string" && data.channel["twitter_enabled"] == "1"){
					streamData.twitterID = data.channel["twitter_account"];
				}
				return streamData.online;
			} else {
				return null;
			}
		},
	"importStreamWebsites":
		function(id, data, pageNumber){
			let streamListSetting = new streamListFromSetting("hitbox");
			let streamList = streamListSetting.objData;
			if(typeof data.following == "object"){
				for(let item of data.following){
					streamListSetting.addStream("hitbox", item["user_name"], "");
				}
				streamListSetting.update();
				
				if(data.following.length > 0){
					let next_url = websites.hitbox.importAPI(id).url;
					let next_page_number = ((typeof pageNumber == "number")? pageNumber : 1) + 1;
					importStreams("hitbox", id, next_url + "&offset=" + next_page_number, next_page_number);
				} else {
					importStreamsEnd(id);
				}
			}
		}
}