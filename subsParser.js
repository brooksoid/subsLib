/**
 * User: mattbr
 * Date: 25/10/2012
 * Time: 12:16
 * Take Redux/arcsub format XML, produce JSON representation fit for dynamic subtitle positioning project
 */

 //eg
 // var mySubs;
 // subsparser.loadAndParse("DRIB161W.xml", function(parsedsubs) {mySubs = parsedsubs;});
 // var subtitlesRedux;
 // subsparser.loadAndParse("bbcone_hunted_redux_dvbsubs.xml", function(parsedsubs) {subtitlesRedux = parsedsubs;});

define(['jquery'], function($){
	'use strict';

	function parse(xml, callback)
	{
		// Decide whether these are from Redux or Arcsub
		var hasTitle = $(xml).find("metadata");

		if (hasTitle.length > 0)
			parseArcSub(xml, callback);
		else
			parseRedux(xml, callback);
	}

	function parseRedux(xml, callback)
	{
		var subs = {subtitles:[]};
		var id = 0;

		console.log("Parsing Redux format");

		var body = $(xml).find("body");

		$(body).find("p").each(function() {
			var line = 0;	//track which line of subtitles we should be on
			var node = $(this);
			var begin = node.attr("begin");
			var end = node.attr("end");

			// Scan for linebreaks
			var childNodes = this.childNodes;
			var n = childNodes.length;
			var spans = [];

			for(var i = 0; i < n; i++)
			{
				if (childNodes[i].tagName === "span")
				{
					spans.push({color:$(childNodes[i]).attr("tts:color"),
								textAlign:$(childNodes[i]).attr("tts:textAlign"),
								line:line,
								text:childNodes[i].textContent
					});
				}
				if (childNodes[i].tagName === "br")
					line++;
			}

			if (spans.length > 3)
				console.log("Warning: Subtitle "+id+" has "+spans.length+"spans!");

			subs.subtitles.push({
				id:id++,
				begin:node.attr("begin"),
				end:node.attr("end"),
				spans:spans
			});
		});
		callback(subs);
	}

	function parseArcSub(xml, callback)
	{
		var subs = {subtitles:[]};
		alert("Not Yet Implemented");
		/*
			var output = $("#output");

			$(xml).find("style").each(function() {
				var n = $(this);
				output.append("id " + n.attr("id") + "style " + n.attr("style") + "tts:color " + n.attr("tts:color") + "<br />");
			});

			$(body).find("p").each(function() {
				var childNodes = this.childNodes;
				var n = childNodes.length;
				for(var i = 0; i < n; i++)
				{
					if (childNodes[i] instanceof Text)
					{
						output.append(childNodes[i].textContent);// output.append(childNodes[i]) was consuming a childnode?
					}
					else
					if (childNodes[i] instanceof Element)
						output.append("<br />");
				}
				output.append("<br />");

			});
		*/
		callback(subs);
	}

	function loadAndParse(url, callback)
	{
		if (url.indexOf("xml") > 0)
		{
			$.ajax( {
				type : 'GET',
				url : url,
				dataType : "xml",
				success : function(xml) {
					parse(xml, callback);
				},
				error : function() {
					console.log("Failed to load " + url);
					alert("Failed to load " + url);
				}
			});
		}
		else if ((url.indexOf("json") > 0) || (url.indexOf("txt") > 0))
		{
			$.ajax( {
				type : 'GET',
				url : url,
				dataType : "json",
				success : function(json) {
					callback({subtitles:json});
				},
				error : function() {
					console.log("Failed to load " + url);
					alert("Failed to load " + url);
				}
			});
		}
		else
			alert("Couldn't loadAndParse subtitles");
	}

	console.log("Returning subsParser module");
	
	return {
		parse:parse,
		loadAndParse:loadAndParse
	};
});