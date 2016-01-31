var currentMediaIndex = 0;
var interval = null;
var mediaItems = [];
var minTagId = null;
var nextUrl = null;
var socket = io();
var subscriptionId = null;
var tag = null;

const IntervalTime = 5000;
const MaxImages = 100;

document.getElementsByTagName('form')[0].addEventListener('submit', function(e) {
  e.preventDefault();

  if (interval) {
    clearInterval(interval);
    socket.emit('delete subscription', subscriptionId);
    interval = minTagId = nextUrl = subscriptionId = tag = null;
    mediaItems = [];
    currentMediaIndex = 0;
  }

  tag = $('#hash_input').val();

  if (tag) {
    getImages();
    makeSubscription();    
  } else {
    $('img').fadeOut('slow');
    $('#ig_text').fadeOut('slow');
  }
});

document.getElementsByTagName('img')[0].addEventListener('click', function(e) {
  if (this.requestFullScreen) {
    this.requestFullScreen();
  } else if (this.msRequestFullscreen) {
    this.msRequestFullscreen();
  } else if (this.mozRequestFullScreen) {
    this.mozRequestFullScreen();
  } else if (this.webkitRequestFullscreen) {
    this.webkitRequestFullscreen();
  }
});

socket.on('new images', function(response) {
  getImages(null, minTagId)
});

window.onbeforeunload = function() {
  socket.emit('delete subscription', subscriptionId)
};

function getImages(url, minId) {
  var data = {tag: tag};
  if (url) data.url = url;
  if (minId) data.minTagId = minId;

  $.getJSON('/images', data, function(response) {
    var newMediaItems = response.data.map(function(obj) {
      return {
        caption: obj.caption.text,
        url: obj.images.standard_resolution.url,
        user: obj.user.username,
        created_time: obj.created_time
      };
    });

    if (response.pagination.next_url) {
      mediaItems = mediaItems.concat(newMediaItems);
      nextUrl = response.pagination.next_url;
    } else {
      mediaItems = mediaItems.splice(0, currentMediaIndex).concat(newMediaItems).concat(mediaItems);
    }

    minTagId = response.pagination.min_tag_id;

    if (interval == null) {
      showNextMediaItem();
      interval = setInterval(showNextMediaItem, IntervalTime);
    }
  });
}

function makeSubscription() {
  var data = {tag: tag};
  $.getJSON('/subscribe', data, function(response) {
    subscriptionId = response.data.id;
  });
}

function showNextMediaItem() {
  if (currentMediaIndex < mediaItems.length) showItemAtIndex(currentMediaIndex++);

  if (currentMediaIndex == MaxImages) {
    mediaItems.sort(createdTime);
    currentMediaIndex = 0;
  } else if (currentMediaIndex == mediaItems.length - 1) {
    getImages(nextUrl);
  }
}

function showItemAtIndex(index) {
  var mediaItem = mediaItems[index];
  $('img').fadeOut('slow', function() {
    $(this).attr('src', mediaItem.url).load(function() {
      $(this).fadeIn('slow');
    });
  });

  $('#ig_text').fadeOut('slow', function() {
    $(this).empty().append('<p>' + mediaItem.caption + '</p> <small>' + mediaItem.user + '</small>');
  }).fadeIn('slow');
}

function createdTime(a, b) {
  return a.created_time > b.created_time ? -1 : a.created_time < b.created_time ? 1 : 0;
}