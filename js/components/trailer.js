export function selectYouTubeTrailer(videos) {

    const youtubeVideos =
        (videos.results || []).filter((video) => video.site === "YouTube");

    return youtubeVideos.find((video) => {
        return video.type === "Trailer" && video.official;
    }) ||
        youtubeVideos.find((video) => video.type === "Trailer") ||
        youtubeVideos[0] ||
        null;

}
