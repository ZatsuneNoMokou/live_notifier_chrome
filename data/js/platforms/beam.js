websites.beam = {
	"API":
		function(id){
			let obj = {
				url: `https://beam.pro/api/v1/channels/${id}`,
				overrideMimeType: "text/plain; charset=utf-8"
			}
			return obj;
		},
	"importAPI":
		function(id){
			let obj = {
				url: `https://beam.pro/api/v1/users/${id}/follows?limit=-1&fields=id,token`,
				overrideMimeType: "text/plain; charset=utf-8"
			}
			return obj;
		},
	"isValidResponse":
		function(data){
			if(data == "Channel not found." || data.statusCode == 404){
				return "error";
			} else {
				return "success";
			}
		},
	"checkLiveStatus":
		function(id, contentId, data){
			let streamData = liveStatus["beam"][id][contentId];
			
			streamData.streamName = data.user["username"];
			streamData.streamStatus = data["name"];
			
			if(typeof data.user["avatarUrl"] == "string" && data.user["avatarUrl"] != ""){
				streamData.streamOwnerLogo = data["user"]["avatarUrl"];
			}
			streamData.streamCurrentViewers = parseInt(data["viewersCurrent"]);
			if(typeof data.user.social["twitter"] == "string" && data.user.social["twitter"] != "" && twitterID_from_url.test(data.user.social["twitter"])){
				streamData.twitterID = twitterID_from_url.exec(data.user.social["twitter"])[1];
			}
			
			streamData.online = data["online"];
			return streamData.online;
		},
	"importStreamWebsites":
		function(id, data){
			let streamListSetting = new streamListFromSetting("beam");
			let streamList = streamListSetting.objData;
			if(typeof data == "object"){
				for(let item of data){
					streamListSetting.addStream("beam", item["token"], "");
				}
				streamListSetting.update();
			}
		}
}
