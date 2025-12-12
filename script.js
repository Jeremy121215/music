// 音乐播放器应用
document.addEventListener('DOMContentLoaded', function() {
    // 全局变量
    const audioPlayer = new Audio();
    let songs = [];
    let filteredSongs = [];
    let currentSongIndex = 0;
    let currentMode = 'order'; // 播放模式: order, random, single
    let isPlaying = false;
    let scrollLyrics = [];
    let searchQuery = '';
    
    // DOM 元素
    const elements = {
        songTitle: document.getElementById('song-title'),
        songArtist: document.getElementById('song-artist'),
        coverImage: document.getElementById('cover-image'),
        playBtn: document.getElementById('play-btn'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        currentTime: document.getElementById('current-time'),
        duration: document.getElementById('duration'),
        songProgress: document.getElementById('song-progress'),
        progressBar: document.querySelector('.progress-bar'),
        progressThumb: document.getElementById('progress-thumb'),
        volumeBtn: document.getElementById('volume-btn'),
        volumeLevel: document.getElementById('volume-level'),
        volumeSlider: document.querySelector('.volume-slider'),
        volumeThumb: document.getElementById('volume-thumb'),
        lyricsDisplay: document.getElementById('lyrics-display'),
        playlist: document.getElementById('playlist'),
        songCount: document.getElementById('song-count'),
        currentMode: document.getElementById('current-mode'),
        loadingOverlay: document.getElementById('loading'),
        modeButtons: {
            order: document.getElementById('order-mode'),
            random: document.getElementById('random-mode'),
            single: document.getElementById('single-mode')
        },
        shufflePlaylistBtn: document.getElementById('shuffle-playlist'),
        searchInput: document.getElementById('search-input'),
        clearSearchBtn: document.getElementById('clear-search')
    };
    
    // 初始化应用
    async function initApp() {
        try {
            // 加载歌曲列表
            await loadSongs();
            
            // 设置事件监听器
            setupEventListeners();
            
            // 初始化音频播放器
            initAudioPlayer();
            
            // 加载第一首歌
            if (songs.length > 0) {
                loadSong(currentSongIndex);
            }
            
            // 隐藏加载动画
            setTimeout(() => {
                elements.loadingOverlay.style.display = 'none';
            }, 500);
            
        } catch (error) {
            console.error('初始化应用时出错:', error);
            elements.loadingOverlay.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff6b6b; margin-bottom: 20px;"></i>
                    <p>加载失败: ${error.message}</p>
                    <p>请检查 songs-list.json 文件是否存在且格式正确</p>
                </div>
            `;
        }
    }
    
    // 从 JSON 文件加载歌曲列表
    async function loadSongs() {
        try {
            const response = await fetch('songs-list.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.songs || !Array.isArray(data.songs)) {
                throw new Error('歌曲列表格式错误，请确保 JSON 文件包含 "songs" 数组');
            }
            
            songs = data.songs.map((song, index) => ({
                ...song,
                index: index,
                duration: 0 // 将在加载音频后设置
            }));
            
            filteredSongs = [...songs];
            
            // 更新歌曲计数
            updateSongCount();
            
            // 渲染播放列表
            renderPlaylist();
            
        } catch (error) {
            console.error('加载歌曲列表时出错:', error);
            throw error;
        }
    }
    
    // 更新歌曲计数
    function updateSongCount() {
        elements.songCount.textContent = `(${filteredSongs.length} 首)`;
    }
    
    // 搜索歌曲
    function searchSongs(query) {
        searchQuery = query.toLowerCase().trim();
        
        if (searchQuery === '') {
            filteredSongs = [...songs];
        } else {
            filteredSongs = songs.filter(song => {
                return song.song_name.toLowerCase().includes(searchQuery) ||
                       song.song_author.toLowerCase().includes(searchQuery);
            });
        }
        
        updateSongCount();
        renderPlaylist();
    }
    
    // 渲染播放列表
    function renderPlaylist() {
        if (filteredSongs.length === 0) {
            elements.playlist.innerHTML = `
                <div class="playlist-empty">
                    <i class="fas fa-search"></i>
                    <p>${searchQuery ? '未找到匹配的歌曲' : '播放列表为空'}</p>
                    <p>${searchQuery ? '请尝试其他搜索词' : '请检查 songs-list.json 文件'}</p>
                </div>
            `;
            return;
        }
        
        let playlistHTML = '';
        
        filteredSongs.forEach((song, listIndex) => {
        // 获取原始索引
        const originalIndex = song.index;
        const isActive = originalIndex === currentSongIndex;
        
        // 获取歌曲文件扩展名（支持大小写）
        const fileExt = song.song_file ? song.song_file.split('.').pop().toLowerCase() : '';
        const supportedFormats = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'];
        const isAudioFile = supportedFormats.includes(fileExt);
        
        // 检查具体是什么格式（用于显示）
        const originalExt = song.song_file ? song.song_file.split('.').pop() : '';
        const isMp3 = fileExt === 'mp3';
        const isWav = fileExt === 'wav';
        const isMp3UpperCase = originalExt === 'MP3';
        const isWavUpperCase = originalExt === 'WAV';
        
        // 格式提示文本
        let formatHint = '';
        if (!isAudioFile && song.song_file) {
            formatHint = '<span class="unsupported-format">格式不支持</span>';
        } else if (isMp3UpperCase || isWavUpperCase) {
            // 如果是大写的MP3或WAV，显示提示
            formatHint = `<span class="uppercase-format">${originalExt}</span>`;
        }
        
        playlistHTML += `
            <div class="playlist-item ${isActive ? 'active' : ''}" data-index="${originalIndex}" data-list-index="${listIndex}">
                <div class="playlist-item-playing">
                    <i class="fas fa-play"></i>
                </div>
                <img src="${song.cover_file ? 'covers/' + song.cover_file : 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/music.svg'}" 
                     alt="${song.song_name || '未知歌曲'}" 
                     onerror="this.src='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/music.svg'">
                <div class="playlist-item-info">
                    <div class="playlist-item-title">${highlightSearchTerm(song.song_name || '未知歌曲')}</div>
                    <div class="playlist-item-artist">${highlightSearchTerm(song.song_author || '未知歌手')}</div>
                </div>
                <div class="playlist-item-duration">${formatTime(song.duration)}</div>
                ${formatHint}
            </div>
        `;
    });
        
        elements.playlist.innerHTML = playlistHTML;
        
        // 为每个播放列表项添加点击事件
        document.querySelectorAll('.playlist-item').forEach(item => {
            item.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                const listIndex = parseInt(this.getAttribute('data-list-index'));
                
                // 如果在搜索状态下，需要找到原始索引
                if (searchQuery) {
                    const song = filteredSongs[listIndex];
                    if (song) {
                        loadSong(song.index);
                        playSong();
                    }
                } else {
                    loadSong(index);
                    playSong();
                }
            });
        });
    }
    
    // 高亮搜索词
    function highlightSearchTerm(text) {
        if (!searchQuery) return text;
        
        const regex = new RegExp(`(${searchQuery})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }
    
    // 初始化音频播放器
    function initAudioPlayer() {
        // 设置初始音量
        audioPlayer.volume = 0.7;
        updateVolumeUI();
        
        // 音频加载完成事件
        audioPlayer.addEventListener('loadedmetadata', function() {
            // 更新歌曲时长
            songs[currentSongIndex].duration = audioPlayer.duration;
            elements.duration.textContent = formatTime(audioPlayer.duration);
            
            // 更新播放列表中的时长
            updatePlaylistDuration(currentSongIndex, audioPlayer.duration);
            
            // 解析歌词
            parseLyrics();
        });
        
        // 音频时间更新事件
        audioPlayer.addEventListener('timeupdate', function() {
            // 更新当前时间
            elements.currentTime.textContent = formatTime(audioPlayer.currentTime);
            
            // 更新进度条
            const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100 || 0;
            elements.songProgress.style.width = `${progress}%`;
            elements.progressThumb.style.left = `${progress}%`;
            
            // 更新歌词高亮
            updateLyricsHighlight();
        });
        
        // 音频播放结束事件
        audioPlayer.addEventListener('ended', function() {
            if (currentMode === 'single') {
                // 单曲循环：重新播放当前歌曲
                audioPlayer.currentTime = 0;
                playSong();
            } else {
                // 顺序或随机：播放下一首
                playNextSong();
            }
        });
        
        // 音频错误处理
        audioPlayer.addEventListener('error', function() {
            console.error('音频加载错误:', audioPlayer.error);
            alert(`无法播放 "${songs[currentSongIndex].song_name}"，请检查音频文件是否存在或格式是否正确。`);
        });
    }
    
    // 设置事件监听器
    function setupEventListeners() {
        // 播放/暂停按钮
        elements.playBtn.addEventListener('click', togglePlay);
        
        // 上一首/下一首按钮
        elements.prevBtn.addEventListener('click', playPrevSong);
        elements.nextBtn.addEventListener('click', playNextSong);
        
        // 进度条点击事件
        elements.progressBar.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const percentage = (e.clientX - rect.left) / rect.width;
            const newTime = percentage * audioPlayer.duration;
            
            if (!isNaN(newTime)) {
                audioPlayer.currentTime = newTime;
            }
        });
        
        // 音量控制
        elements.volumeSlider.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const percentage = 1 - ((e.clientY - rect.top) / rect.height);
            const newVolume = Math.max(0, Math.min(1, percentage));
            
            audioPlayer.volume = newVolume;
            updateVolumeUI();
        });
        
        // 播放模式按钮
        elements.modeButtons.order.addEventListener('click', function() {
            setPlayMode('order');
        });
        
        elements.modeButtons.random.addEventListener('click', function() {
            setPlayMode('random');
        });
        
        elements.modeButtons.single.addEventListener('click', function() {
            setPlayMode('single');
        });
        
        // 随机播放列表按钮
        elements.shufflePlaylistBtn.addEventListener('click', shufflePlaylist);
        
        // 搜索功能
        elements.searchInput.addEventListener('input', function() {
            searchSongs(this.value);
        });
        
        elements.clearSearchBtn.addEventListener('click', function() {
            elements.searchInput.value = '';
            searchSongs('');
        });
        
        // 搜索框回车键
        elements.searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && filteredSongs.length > 0) {
                // 播放第一首搜索结果
                const firstSong = filteredSongs[0];
                loadSong(firstSong.index);
                playSong();
            }
        });
        
        // 窗口大小变化时调整UI
        window.addEventListener('resize', adjustUIForScreenSize);
    }
    
    // 加载指定索引的歌曲
    function loadSong(index) {
        if (index < 0 || index >= songs.length) return;
        
        const song = songs[index];
        currentSongIndex = index;
        
        // 更新UI
        elements.songTitle.textContent = song.song_name;
        elements.songArtist.textContent = song.song_author;
        
        // 设置专辑封面（确保1:1比例）
        const coverPath = song.cover_file ? 'covers/' + song.cover_file : '';
        elements.coverImage.src = coverPath;
        elements.coverImage.onerror = function() {
            this.src = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/svgs/solid/compact-disc.svg';
        };
        
        // 设置音频源
        audioPlayer.src = 'songs/' + song.song_file;
        
        // 重置时间和进度条
        elements.currentTime.textContent = '0:00';
        elements.songProgress.style.width = '0%';
        elements.progressThumb.style.left = '0%';
        
        // 更新播放列表高亮
        updatePlaylistHighlight();
        
        // 解析歌词
        parseLyrics();
        
        // 如果之前正在播放，继续播放
        if (isPlaying) {
            // 先暂停，然后重新播放以确保加载新源
            audioPlayer.pause();
            setTimeout(() => {
                playSong();
            }, 100);
        }
    }
    
    // 播放/暂停切换
    function togglePlay() {
        if (audioPlayer.src) {
            if (isPlaying) {
                pauseSong();
            } else {
                playSong();
            }
        } else if (songs.length > 0) {
            // 如果没有加载歌曲但列表中有歌曲，加载并播放第一首
            loadSong(0);
            playSong();
        }
    }
    
    // 播放歌曲
    function playSong() {
        const playPromise = audioPlayer.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isPlaying = true;
                elements.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                elements.playBtn.title = '暂停';
                
                // 添加播放动画
                document.querySelector('.cover-wrapper').classList.add('playing');
                
                // 更新播放列表中的播放状态
                updatePlaylistHighlight();
            }).catch(error => {
                console.error('播放失败:', error);
                alert('播放失败，请检查音频文件格式或浏览器自动播放策略。');
            });
        }
    }
    
    // 暂停歌曲
    function pauseSong() {
        audioPlayer.pause();
        isPlaying = false;
        elements.playBtn.innerHTML = '<i class="fas fa-play"></i>';
        elements.playBtn.title = '播放';
        
        // 移除播放动画
        document.querySelector('.cover-wrapper').classList.remove('playing');
    }
    
    // 播放下一首歌曲
    function playNextSong() {
        let nextIndex;
        
        switch (currentMode) {
            case 'random':
                nextIndex = getRandomSongIndex();
                break;
            case 'single':
                nextIndex = currentSongIndex; // 单曲循环时播放同一首
                break;
            case 'order':
            default:
                nextIndex = (currentSongIndex + 1) % songs.length;
                break;
        }
        
        loadSong(nextIndex);
        playSong();
    }
    
    // 播放上一首歌曲
    function playPrevSong() {
        let prevIndex;
        
        switch (currentMode) {
            case 'random':
                prevIndex = getRandomSongIndex();
                break;
            case 'single':
                prevIndex = currentSongIndex; // 单曲循环时播放同一首
                break;
            case 'order':
            default:
                prevIndex = currentSongIndex - 1;
                if (prevIndex < 0) prevIndex = songs.length - 1;
                break;
        }
        
        loadSong(prevIndex);
        playSong();
    }
    
    // 获取随机歌曲索引（排除当前歌曲）
    function getRandomSongIndex() {
        if (songs.length <= 1) return 0;
        
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * songs.length);
        } while (randomIndex === currentSongIndex && songs.length > 1);
        
        return randomIndex;
    }
    
    // 设置播放模式
    function setPlayMode(mode) {
        currentMode = mode;
        
        // 更新按钮状态
        Object.keys(elements.modeButtons).forEach(key => {
            if (key === mode) {
                elements.modeButtons[key].classList.add('active');
            } else {
                elements.modeButtons[key].classList.remove('active');
            }
        });
        
        // 更新模式显示文本
        const modeTexts = {
            order: '顺序播放',
            random: '随机播放',
            single: '单曲循环'
        };
        elements.currentMode.textContent = modeTexts[mode];
    }
    
    // 随机播放列表
    function shufflePlaylist() {
        // Fisher-Yates 洗牌算法
        for (let i = songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [songs[i], songs[j]] = [songs[j], songs[i]];
        }
        
        // 更新索引
        songs.forEach((song, index) => {
            song.index = index;
        });
        
        // 重新搜索和渲染播放列表
        searchSongs(searchQuery);
        
        // 如果当前播放的歌曲在列表中，找到它的新位置
        const currentSongId = songs.find(song => song.index === currentSongIndex)?.id;
        if (currentSongId) {
            const newIndex = songs.findIndex(song => song.id === currentSongId);
            if (newIndex !== -1) {
                currentSongIndex = newIndex;
                updatePlaylistHighlight();
            }
        }
        
        // 短暂提示
        showNotification('播放列表已随机排序');
    }
    
    // 解析歌词
    function parseLyrics() {
        const song = songs[currentSongIndex];
        elements.lyricsDisplay.innerHTML = '';
        scrollLyrics = [];
        
        if (!song.song_lyric || song.song_lyric.trim() === '') {
            elements.lyricsDisplay.innerHTML = '<div class="no-lyrics">该歌曲暂无歌词</div>';
            return;
        }
        
        const lyrics = song.song_lyric;
        
        if (song.has_scroll_lyric) {
            // 解析滚动歌词（带时间戳）
            const lines = lyrics.split('\n');
            let lyricsHTML = '';
            
            lines.forEach(line => {
                // 匹配时间戳和歌词内容
                const match = line.match(/\[(\d+):(\d+)(?:\.(\d+))?\](.*)/);
                
                if (match) {
                    const minutes = parseInt(match[1]);
                    const seconds = parseInt(match[2]);
                    const milliseconds = match[3] ? parseInt(match[3]) : 0;
                    const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
                    const text = match[4].trim();
                    
                    if (text) {
                        scrollLyrics.push({
                            time: timeInSeconds,
                            text: text
                        });
                        
                        lyricsHTML += `
                            <div class="lyric-line" data-time="${timeInSeconds}">
                                ${text}
                            </div>
                        `;
                    }
                } else if (line.trim()) {
                    // 没有时间戳的歌词行
                    lyricsHTML += `
                        <div class="lyric-line">
                            ${line}
                        </div>
                    `;
                }
            });
            
            elements.lyricsDisplay.innerHTML = lyricsHTML;
        } else {
            // 普通歌词（无时间戳）
            const lines = lyrics.split('\n');
            let lyricsHTML = '';
            
            lines.forEach(line => {
                if (line.trim()) {
                    lyricsHTML += `
                        <div class="lyric-line">
                            ${line}
                        </div>
                    `;
                }
            });
            
            elements.lyricsDisplay.innerHTML = lyricsHTML;
        }
    }
    
    // 更新歌词高亮
    function updateLyricsHighlight() {
        const currentTime = audioPlayer.currentTime;
        const lyricLines = document.querySelectorAll('.lyric-line');
        
        // 移除所有高亮
        lyricLines.forEach(line => line.classList.remove('active'));
        
        if (songs[currentSongIndex].has_scroll_lyric && scrollLyrics.length > 0) {
            // 滚动歌词：找到当前时间对应的歌词
            let activeIndex = -1;
            
            for (let i = scrollLyrics.length - 1; i >= 0; i--) {
                if (currentTime >= scrollLyrics[i].time) {
                    activeIndex = i;
                    break;
                }
            }
            
            if (activeIndex >= 0) {
                const activeLine = lyricLines[activeIndex];
                if (activeLine) {
                    activeLine.classList.add('active');
                    
                    // 滚动到当前歌词位置
                    const container = elements.lyricsDisplay;
                    const lineTop = activeLine.offsetTop;
                    const containerHeight = container.clientHeight;
                    
                    container.scrollTo({
                        top: lineTop - containerHeight / 3,
                        behavior: 'smooth'
                    });
                }
            }
        }
    }
    
    // 更新音量UI
    function updateVolumeUI() {
        const volume = audioPlayer.volume;
        elements.volumeLevel.style.height = `${volume * 100}%`;
        elements.volumeThumb.style.bottom = `${volume * 100}%`;
        
        // 更新音量图标
        const volumeIcon = elements.volumeBtn.querySelector('i');
        if (volume === 0) {
            volumeIcon.className = 'fas fa-volume-mute';
        } else if (volume < 0.5) {
            volumeIcon.className = 'fas fa-volume-down';
        } else {
            volumeIcon.className = 'fas fa-volume-up';
        }
    }
    
    // 更新播放列表高亮
    // 更新歌词高亮
    function updateLyricsHighlight() {
        const currentTime = audioPlayer.currentTime;
        const lyricLines = document.querySelectorAll('.lyric-line');
        
        // 如果没有歌词，直接返回
        if (lyricLines.length === 0) return;
        
        // 移除所有高亮
        lyricLines.forEach(line => line.classList.remove('active'));
        
        const song = songs[currentSongIndex];
        if (!song || !song.has_scroll_lyric || scrollLyrics.length === 0) {
            return;
        }
        
        // 找到当前时间对应的歌词索引
        let activeIndex = -1;
        for (let i = scrollLyrics.length - 1; i >= 0; i--) {
            if (currentTime >= scrollLyrics[i].time) {
                activeIndex = i;
                break;
            }
        }
        
        // 如果没有找到合适的歌词行，返回
        if (activeIndex < 0) {
            // 可能歌词还没开始，高亮第一行
            const firstLine = lyricLines[0];
            if (firstLine && currentTime < 1) {
                firstLine.classList.add('active');
            }
            return;
        }
        
        // 高亮当前歌词行
        const activeLine = lyricLines[activeIndex];
        if (!activeLine) return;
        
        activeLine.classList.add('active');
        
        // 获取歌词容器和当前行位置
        const container = elements.lyricsDisplay;
        if (!container) return;
        
        const lineTop = activeLine.offsetTop;
        const lineHeight = activeLine.offsetHeight;
        const containerHeight = container.clientHeight;
        const containerScrollTop = container.scrollTop;
        
        // 计算当前行在容器中的位置
        const lineBottom = lineTop + lineHeight;
        const viewportTop = containerScrollTop;
        const viewportBottom = containerScrollTop + containerHeight;
        
        // 检查当前行是否在可视区域内
        const isInView = (lineTop >= viewportTop && lineTop <= viewportBottom) || 
                         (lineBottom >= viewportTop && lineBottom <= viewportBottom);
        
        // 只有当歌词行不在可视区域内时才滚动
        if (!isInView) {
            // 计算滚动位置：让当前行显示在容器中间偏上的位置（1/4处）
            // 这样可以看到当前行和接下来几行歌词
            const targetScrollTop = lineTop - (containerHeight / 4);
            
            // 限制滚动范围
            const maxScrollTop = container.scrollHeight - containerHeight;
            const safeScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
            
            // 使用平滑滚动
            container.scrollTo({
                top: safeScrollTop,
                behavior: 'smooth'
            });
        }
        
        // 同时，确保上一行歌词也适当显示（提供上下文）
        // 这样可以避免当前行被滚动到太靠上的位置
        if (activeIndex > 0) {
            const prevLine = lyricLines[activeIndex - 1];
            if (prevLine) {
                const prevLineTop = prevLine.offsetTop;
                const prevLineInView = prevLineTop >= viewportTop && prevLineTop <= viewportBottom;
                
                // 如果上一行不在可视区域，可能需要向上滚动一点以显示上下文
                if (!prevLineInView && (lineTop - prevLineTop) > containerHeight / 2) {
                    // 向上滚动一点，让上一行也可见
                    const contextScrollTop = prevLineTop - (containerHeight / 6);
                    const safeContextScrollTop = Math.max(0, Math.min(contextScrollTop, maxScrollTop));
                    
                    container.scrollTo({
                        top: safeContextScrollTop,
                        behavior: 'smooth'
                    });
                }
            }
        }
    }
    
    // 更新播放列表中的歌曲时长
    function updatePlaylistDuration(index, duration) {
        songs[index].duration = duration;
        
        // 更新所有播放列表项中的时长显示
        document.querySelectorAll('.playlist-item').forEach(item => {
            if (parseInt(item.getAttribute('data-index')) === index) {
                const durationElement = item.querySelector('.playlist-item-duration');
                if (durationElement) {
                    durationElement.textContent = formatTime(duration);
                }
            }
        });
    }
    
    // 格式化时间（秒 -> MM:SS）
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    // 显示通知
    function showNotification(message) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(90deg, #6a11cb 0%, #2575fc 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 1000;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease, fadeOut 0.3s ease 2s forwards;
        `;
        
        // 添加动画关键帧
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(styleSheet);
        
        document.body.appendChild(notification);
        
        // 3秒后移除通知
        setTimeout(() => {
            notification.remove();
            styleSheet.remove();
        }, 2500);
    }
    
    // 根据屏幕大小调整UI
    function adjustUIForScreenSize() {
        // 这里可以添加响应式调整逻辑
    }
    
    // 初始化应用
    initApp();
});
