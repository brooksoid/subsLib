//////////////////////////////////////////////////////////////////////////////////////////
// Subtitles.js - prototype for subtitle container object and useful functions
// Matt Brooks

define(["BoundingBox2D"], function(BoundingBox2D) {
	'use strict';

	//////////////////////////////////////////////////////////////////////////////////////////
	// SpanPosition constructor
	function SpanPosition(time, x, y, bounds)
	{
		this.time = time;
		this.x = x;
		this.y = y;
		this.bounds = bounds;
	}

	SpanPosition.prototype.set = function(x, y) {
		this.x = x;// / fixedWidth;
		this.y = y;// / fixedHeight;
		this.bounds.moveTo(this.x, this.y);
	};

	SpanPosition.prototype.get = function(canvasWidth, canvasHeight) {
		return {x: this.x * canvasWidth, y: this.y * canvasHeight};
	};

	//////////////////////////////////////////////////////////////////////////////////////////
	// Subtitles constructor
	function Subtitles(subtitleData)
	{
		// All the subtitles are in subtitleData

		this.subtitles = subtitleData;
		this.canvas = null;
		this.usePrecalculatedPositions = false;

		// Process subtitle timecodes (they're from the original TTML and we want them in seconds
		// Also fix up prototypes - subtitleData may have just been deserialised from JSON

		var videosub_tcsecs = function(tc) {
			var tc1 = tc.split('.');
			var tc2 = tc1[0].split(':');
			var secs = Math.floor(tc2[0]*60*60) + Math.floor(tc2[1]*60) + Math.floor(tc2[2]) + (tc1[1] * 0.001);
			return secs;
		};

		var hasBounds = false;

		var that = this;

		this.subtitles.forEach(function(elem) {
			elem.beginSecs = videosub_tcsecs(elem.begin);
			elem.endSecs = videosub_tcsecs(elem.end);
			elem.crossesBoundary = null;

	//		elem.__proto__ = SpanPosition.prototype;
	//		if ('bounds' in elem)
	//			elem.bounds.__proto__ = BoundingBox2D.prototype;

			elem.spans.forEach(function(span) {
				if (span.hasOwnProperty('position'))
				{
					span.position.__proto__ = SpanPosition.prototype;

					if (span.position.hasOwnProperty('bounds')) {
						span.position.bounds.__proto__ = BoundingBox2D.prototype;
					}
				}
				if (!that.usePrecalculatedPositions)
				{
					if (span.hasOwnProperty('bounds'))
					{
						console.log("HAS BOUNDS");
						that.usePrecalculatedPositions = true;
					}
				}
			});
		});

		// Made change in eyeVis from "bounds" to "position"
		// if ("position" in this.subtitles[0].spans[0])	// Originated from JSON therefore positions already calculated. Use them.
		// {
		// 	console.log("Using preecalculated positions");
		// 	this.usePrecalculatedPositions = true;			
		// }
			
	}

	//////////////////////////////////////////////////////////////////////////////////////////
	// makeDefaultCanvasPositions -
	//
	// 		For the given Canvas size, position any subtitle that doesn't already have a position
	//		in the centre of the lower portion of the screen (classic subtitle placement)
	//
	//		Subtitles that ALREADY have a position in the JSON are not altered
	//
	//		The idea being that the workflow is to take TTML subtitles through TTMLTOJSON.PY
	//		where they'll arrive without any positioning info... they're then positioned and saved in the web app
	//


	Subtitles.prototype.makeDefaultCanvasPositions = function (videoElement, fontName, fontSizeString, lineHeight) {

		// Don't use the same canvas as we're using for rendering.
		// Easy to muck up metrics by not resetting state here. So create local one just for measuring.

		if (this.canvas === null)
		{
			this.canvas = document.createElement('canvas');
			this.canvas.width = 1024;
			this.canvas.height = 576;
			this.canvas.id = "temp";
			$("#debug").append(this.canvas);

			var c = this.canvas.getContext('2d');
			c.font = fontSizeString + " '" + fontName + "'";
			c.textBaseline = "top";
			c.textAlign = "center";
			c.fillStyle = "white";
		}

		var ctx = this.canvas.getContext('2d');
		var fixedHeight = this.canvas.height, fixedWidth = this.canvas.width;
		console.log("Making default canvas positions with canvas size " +fixedWidth + "," +fixedHeight);

		var fontSizeIn = parseInt(fontSizeString);
		var lowerMargin = lineHeight * 2;
		var x = fixedWidth / 2;

		var numSubtitlesPositioned = 0;

		this.subtitles.forEach(function (elem) {

			var currentLine = 0;
			var numSpans = elem.spans.length;
			var y = fixedHeight - lowerMargin - (numSpans * lineHeight);

			// Measure metrics with centered text
			elem.spans.forEach(function (span) {
				// Don't overwrite any existing positional data we may load in the future
				if (!span.hasOwnProperty('position')) {
					numSubtitlesPositioned++;
					var lineY = y + (lineHeight * currentLine);
					var metrics = ctx.measureText(span.text);
	//				var metrics = getTextMetrics(span.text, 32, fontname, ctx);
					var halfwidth = metrics.width * 0.5;

					var bb = new BoundingBox2D();
					bb.addPoint((x - halfwidth) / fixedWidth, (lineY) / fixedHeight);
					bb.addPoint((x - halfwidth) / fixedWidth, (lineY + lineHeight) / fixedHeight);
					bb.addPoint((x + halfwidth) / fixedWidth, (lineY) / fixedHeight);
					bb.addPoint((x + halfwidth) / fixedWidth, (lineY + lineHeight) / fixedHeight);

					span.position = new SpanPosition(elem.beginSecs, (x - halfwidth) / fixedWidth, lineY / fixedHeight, bb);
					currentLine++;
				}
			});

			// We'll position the text from the left from now on
			// as we've stored center positions above, and we'll use those for rendering.
			//		ctx.textAlign = "left";  <-------- ONLY FOR MAIN RENDER CANVAS
		});

		console.log("numSubtitlesPositioned: " + numSubtitlesPositioned);
	};

	//////////////////////////////////////////////////////////////////////////////////////////
	// Return list of subtitles active at this time

	Subtitles.prototype.getActive = function(time)
	{
		// Account for dynamic subtitle time offset
		// MRBTODO: FIX THIS
		// time += this.timeOffset;

		var filterFunction = function(elem)
		{
			return ((time >= elem.beginSecs) && (time <= elem.endSecs));
		};

		return $.grep(this.subtitles, filterFunction);
	};

	//////////////////////////////////////////////////////////////////////////////////////////
	// Return list of subtitles active at this time containing point mx and my

	Subtitles.prototype.pick = function(time, mx, my)
	{
		var activeSubs = this.getActive(time);

		var result = {"pickedSubtitles":[],"pickedSpans":[]};

		activeSubs.forEach(function(activeSub) {
			activeSub.spans.forEach(function(span) {
				if (span.position.bounds.testPoint(mx, my))
				{
					result.pickedSubtitles.push(activeSub);
					result.pickedSpans.push(span);
				}
			});
		});
		return result;
	};

	///

	Subtitles.prototype.renderAtDefaultPosition = function (elem, canvas, lineHeight) {

		var ctx = canvas.getContext('2d');

		//in subsEyeVis, this.canvas is NULL. 

		//var fixedHeight = this.canvas.height, fixedWidth = this.canvas.width;
		var fixedHeight = canvas.height, fixedWidth = canvas.width;

		var lowerMargin = lineHeight * 2;
		var x = fixedWidth / 2;

		var currentLine = 0;
		var numSpans = elem.spans.length;
		var y = fixedHeight - lowerMargin - (numSpans * lineHeight);

		ctx.textAlign = "center";


		// This code ensures regular positioned iPlayer style subs have correct font etc
		ctx.lineWidth = 1;
//		var relativeSize = subsEditor.canvas.width / subsEditor.videoElement.videoWidth;//MRBTODO this was at 1280.0 - I think subsEditor.videoElement.videoWidth is what I want...
		var relativeSize = 1;
		var fS = 28 * relativeSize;
		var fSS = fS+"px";
		var fontSpecifier = fSS + " '" + "Helvetica Neue" + "'";
		ctx.font = fontSpecifier;// "'TiresiasS'";

		ctx.textBaseline = "top"; //going fullscreen resets this!
		ctx.strokeStyle = "black";
//		ctx.textAlign = "left";






		if (0)
		{
			// MRBTODO - HANDLE THIS PROPER, LIKE 

			// CEEFAX STYLE!

			// Measure metrics with centered text
			elem.spans.forEach(function (span) {
				// Don't overwrite any existing positional data we may load in the future
				var lineY = y + (lineHeight * currentLine);
				var metrics = ctx.measureText(span.text);
				var halfwidth = metrics.width * 0.5;

				var tl = {x:(x - halfwidth) , y:lineY};
				var br = {x:(x + halfwidth) , y:lineY + lineHeight};
				ctx.fillStyle = "black";
				ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
				currentLine++;
			});

			currentLine = 0;
			elem.spans.forEach(function (span) {
				var lineY = y + (lineHeight * currentLine);
				ctx.fillStyle = span.color;
				ctx.fillText(span.text, x, lineY);
				currentLine++;
			});

		}
		else
		{
			ctx.strokeStyle = "black";
			ctx.fillStyle = "white";
			ctx.lineWidth = 5;

			currentLine = 0;
			elem.spans.forEach(function (span) {
				var lineY = y + (lineHeight * currentLine);
				ctx.strokeText(span.text, x, lineY);
				ctx.fillText(span.text, x, lineY);
				currentLine++;
			});
		}
	};


	Subtitles.prototype.calculateBoundaryCrosses = function (analysis_data, analysis_timing_offset) {
		if (analysis_timing_offset === undefined){
			analysis_timing_offset = 0;
		}
		if(analysis_data === undefined){
			console.log("Analysis data empty");
			return;
		}

		var timecodeToSeconds = function(hh_mm_ss_ff) {
			var tc_array = hh_mm_ss_ff.split(":");
			var tc_hh = parseInt(tc_array[0], 10);
			var tc_mm = parseInt(tc_array[1], 10);
			var tc_ss = parseFloat(tc_array[2]);
			var tc_in_seconds = ( tc_hh * 3600 ) + ( tc_mm * 60 ) + tc_ss;
			return tc_in_seconds;
		};

		var numCrossings = 0;
		this.subtitles.forEach(function(elem) {
			var begin = elem.beginSecs - analysis_timing_offset;
			var end = elem.endSecs - analysis_timing_offset;
			var num_analysis_data = analysis_data.length;
			elem.crossesBoundary = false;
			for (var i=0; i<num_analysis_data; i++){
				var analysis_time = timecodeToSeconds(analysis_data[i]['frame-analysis']['time']);
				if(analysis_data[i]['frame-analysis']['newshot'] == true && analysis_time>begin && analysis_time<end){
					elem.crossesBoundary = true;
					numCrossings++;
				}
			}
		});
		console.log("calculateBoundaryCrosses numCrossings:" + numCrossings);
	};

	//from subsEditor.js
	Subtitles.prototype.renderIplayerStyle = function(elem, canvas)
	{
		var ctx = canvas.getContext('2d');
		ctx.lineWidth = 1;
//		var relativeSize = subsEditor.canvas.width / subsEditor.videoElement.videoWidth;//MRBTODO this was at 1280.0 - I think subsEditor.videoElement.videoWidth is what I want...
		var relativeSize = 1;
		var fS = 28 * relativeSize;
		var fSS = fS+"px";
		var fontSpecifier = fSS + " '" + "Helvetica Neue" + "'";
		ctx.font = fontSpecifier;// "'TiresiasS'";

		ctx.textBaseline = "top"; //going fullscreen resets this!
		ctx.strokeStyle = "black";
		ctx.textAlign = "left";

		elem.spans.forEach(function(span)
		{
			ctx.fillStyle = "white";
			//Iplayer style text - black text outline
			ctx.lineWidth = 5;
			ctx.strokeText(span.text, span.position.x * canvas.width, span.position.y * canvas.height);
			ctx.fillText(span.text, span.position.x * canvas.width, span.position.y * canvas.height);
		});		
	};

	// eyevis needs this function
	Subtitles.prototype.renderAtPrecalculatedPosition = function (elem, canvas) {
		var relativeSize = canvas.width / 1024;
		var fS = 32 * relativeSize;					
		var ctx = canvas.getContext('2d');
		ctx.font = fS + "px 'TiresiasS'";
		ctx.textBaseline = "top"; //going fullscreen resets this!
		ctx.textAlign = "center";
		ctx.fillStyle = "black";

		elem.spans.forEach(function (span) {
			ctx.fillRect(span.bounds.tl.x * canvas.width, 
						span.bounds.tl.y * canvas.height, 
						(span.bounds.br.x - span.bounds.tl.x) * canvas.width, 
						(span.bounds.br.y - span.bounds.tl.y) * canvas.height);
		});

		elem.spans.forEach(function (span) {
			ctx.fillStyle = span.color;
			ctx.fillText(span.text, span.centerTextPos.x * canvas.width, span.centerTextPos.y * canvas.height);
		});
	};

	// eyevis needs this function - not sure it'll get called without renderStyles
	Subtitles.prototype.renderAtTime = function(t, canvas, renderStyles)
	{
		var nextSubtitleIndex = -1;

		for (var i = 0, n = this.subtitles.length; i < n; i++)
		{
			if ((t >= this.subtitles[i].beginSecs) && (t <= this.subtitles[i].endSecs))
			{
				nextSubtitleIndex = i;
				break;
			}
		}

		if (nextSubtitleIndex != -1)
		{
			if (renderStyles)
			{
				if (renderStyles.ceefax)
					this.renderAtPrecalculatedPosition(this.subtitles[nextSubtitleIndex], canvas);

				if (renderStyles.iPlayerPositioned)
					this.renderIplayerStyle(this.subtitles[nextSubtitleIndex], canvas);	

				if (renderStyles.iPlayerRegular)
					this.renderAtDefaultPosition(this.subtitles[nextSubtitleIndex], canvas, 32); //MRBTODO 32??!
			}
			else
			{
				//Eyevis needs this function - not sure it'll get called without renderStyles

				//Control using data analysis - will this code now be redundant?
				if (this.usePrecalculatedPositions)
					this.renderAtPrecalculatedPosition(this.subtitles[nextSubtitleIndex], canvas);
				else
				{
					this.renderIplayerStyle(this.subtitles[nextSubtitleIndex], canvas);
				}
			}
		}
		return nextSubtitleIndex;
	};

	// eyevis needs this function
	// This is used from gensubpos.html to store text metrics back to subtitle JSON
	Subtitles.prototype.renderAllAtOnce = function(canvas)
	{
		var that = this;

		this.subtitles.forEach(function(elem) {
			that.renderAtDefaultPosition(elem, canvas, true);
		});	
	};


	console.log("subtitles.js returning Subtitles");
	return Subtitles;
}, function(errback) {
	console.log("Require error" + errback);
});