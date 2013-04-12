define(function(){
	return {
		smpteToSeconds:	function(hh_mm_ss_ff, fps)
		{
			var tc_array = hh_mm_ss_ff.split(":");
			var tc_hh = parseInt(tc_array[0], 10);
			var tc_mm = parseInt(tc_array[1], 10);
			var tc_ss = parseInt(tc_array[2], 10);
			var tc_ff = parseInt(tc_array[3], 10);
			var tc_in_seconds = ( tc_hh * 3600 ) + ( tc_mm * 60 ) + tc_ss + ( tc_ff / fps );
			return tc_in_seconds;
		},
		secondsToSmpte:	function(time, fps) {
			var hours = Math.floor(time / 3600) % 24;
			var minutes = Math.floor(time / 60) % 60;
			var seconds = Math.floor(time % 60);
			var frames = Math.floor(((time % 1)*fps).toFixed(3));

			var result = (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds) + ":" + (frames < 10 ? "0" + frames : frames);
			return result;
		}
	};
});