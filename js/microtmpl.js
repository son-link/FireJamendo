~function(){
	
	var microTmpl = function(tmpl,data){
		tmpl = document.getElementById(tmpl).innerHTML;
		var itemdata;
		function strReplace(match,itemName){
			return typeof itemdata[itemName] !== 'undefined'?
					itemdata[itemName]:'';
		}
		if(typeof data.length === 'undefined'){
			data = [data];
		}
		var ret = '';
		data.forEach(function(dataItem){
			itemdata = dataItem;
			ret += tmpl.replace(/\{%(\w+)%\}/g,strReplace);
		});
		return ret;
	};

	if(typeof window !== 'undefined'){
		window.microTmpl = window.MicroTmpl = microTmpl;
	}else{
		module.exports = microTmpl;
	}

}();
