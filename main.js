(function($){
  
  var store = window.localStorage;
  
  var docsRegister = {
    list: [],
    refreshList: function(){
      this.list = [];
      
      var name, data;
      for(var i=0; i<store.length; i++){
        name = store.key(i);
        if(name){
          data = Doc.unserialize(store.getItem(name));
          if(data && Doc.validData(data)){
            this.list.push(name);
          }
        }
      }
      $(window).trigger('listRefreshed.docsRegister');
      return this;
    },
    remove: function(name){
      store.removeItem(name);
    },
    nameAvailable: function(name){
      return this.list.indexOf(name) === -1;
    },
    resolveName: function(name){
      var i = 0;
      var suggestedName = name;
      while(!this.nameAvailable(suggestedName)){
        suggestedName = name+'-'+i;
      }
      return suggestedName;
    }
  };
  
  
  //Doc class
  function Doc(name, data){
    $.extend(this, {
      name: '',
      defaultData: {type:'doc'},
      data:{},
      
      getName: function(){
        return this.name;
      },
      getData: function(){
        return this.data;
      },
      
      setName: function(name){
        if(Doc.validName(name))
          this.name = name;
        return this;
      },
      setData: function(data){
        data = $.extend({}, this.defaultData, data);
        if(Doc.validData(data))
          this.data = data;
        return this;
      },
      
      load: function(name){
        var data = store.getItem(name);
        if(data !== null){
          this.setName(name);
          this.setData(Doc.unserialize(data));
        }
        return this;
      },
      save: function(){
        if(Doc.validName(this.name) && Doc.validData(this.data)){
          var serialized = Doc.serialize(this.data);
          if($.type(serialized) === 'string'){
            store.setItem(this.name, serialized);
            return true;
          }
        }
        return false;
      }
    });
    
    //constructor
    if(data === void(0)){
      if(name !== void(0)){
        this.load(name);
      }
    }else{
      this.setData(data);
      this.setName(name);
    }
  };
  Doc.serialize = function(ob){
    return JSON.stringify(ob);
  };
  Doc.unserialize = function(str){
    var ob;
    try{
      ob = JSON.parse(str);
    }catch(e){
      ob = null;
    }
    return ob;
  };
  Doc.validName = function(name){
    return $.type(name) === 'string' && name == Doc.escapeName(name);
  };
  Doc.validData = function(data, checkType = true){
    return $.type(data) === 'object' && data.title && data.content && (!checkType || data.type === 'doc');
  };
  Doc.escapeName = function(name){
    return name.toLowerCase().replace(/ /g,'-').replace(/[^\w-]+/g,'');
  };
  
  $(document).ready(function(){
    
    var $name = $('[name="name"]'),
      $oldName = $('[name="old-name"]'),
      $title = $('[name="title"]'),
      $content = $('[name="content"]'),
      $save = $('#save'),
      $delete = $('#delete'),
      $download = $('#download'),
      $message = $('.actions .message'),
      $list = $('.history .list');
    
    $(window).on('listRefreshed.docsRegister', function(){
      var name = window.location.hash.substr(1);
      if(name){
        var doc = new Doc(name);
        $name.val(doc.getName());
        $oldName.val(doc.getName());
        $title.val(doc.getData().title);
        $content.val(doc.getData().content);
      
        $('head title').html(doc.getData().title + ' | Writer');
      }else{
        $name.val('');
        $oldName.val('');
        $title.val('');
        $content.val('');
      }
      
      var doc, $li;
      var $ol = $('.history > ol.list');
      $ol.html('');
      for(var i=0; i<docsRegister.list.length; i++){
        doc = new Doc(docsRegister.list[i]);
        $li = $('<li><a href="#'+doc.getName()+'">'+doc.getData().title+'</a></li>');
        if(name === doc.getName())
          $li.addClass('current');
        $ol.append($li);
      }
    });
    
    $save.on('click', function(){
      $message.addClass('maintain');
      $message.html('Saving...');
      var name = $name.val();
      
      if(!name){
        $message.html('Saving failed: needs hash.');
        $message.removeClass('maintain');
        return;
      }
      
      var oldName = $oldName.val();
      var data = {
        title: $title.val(),
        content: $content.val()
      };
      var doc = new Doc(name, data);
      if(name !== oldName && oldName){
        docsRegister.remove(oldName);
      }
      if(doc.save()){
        window.location.hash = '#'+doc.getName();
        $message.html('Saved.');
        docsRegister.refreshList();
      }else{
        $message.html('Saving failed.');
      }
      $message.removeClass('maintain');
    });
    
    $delete.on('click', function(){
      $message.addClass('maintain').html('Deleting');
      var oldName = $oldName.val();
      if(window.confirm('Do you really want to delete #'+oldName+'?')){
        window.location.hash = '';
        docsRegister.remove(oldName);
        $message.html('Deleted.');
        docsRegister.refreshList();
      }else{
        $message.html('Did not delete.');
      }
      $message.removeClass('maintain');
    });
    
    $download.on('click', function(){
      var $this = $(this);
      var blob = new Blob(
        [$title.val()+'\n\n'+$content.val()],
        {type:'text/plain'}
      );
      $this.attr('href', URL.createObjectURL(blob));
      $this.attr('download', $name.val()+'.txt');
    });
    
    $name.on('change', function(){
      var $this = $(this);
      var val = $this.val();
      var encval = Doc.escapeName(val);
      
      if(encval !== val){
        $this.val(encval);
      }
    });
    
    $title.on('blur', function(){
      if($name.val() == ''){
        $name.val($title.val()).trigger('change');
      }
    });
    
    $content.on('input propertychange', function(){
      if(this.scrollHeight > this.clientHeight){
        var $this = $(this);
        $this.css('height', ($this.height()+200)+'px');
      }
    });
    
    $list.on('click', 'li > a', function(){
      window.setTimeout(docsRegister.refreshList, 100);
    });
    
    window.setInterval(function(){
      if(!$message.hasClass('maintain'))
        $message.html('');
    }, 10000);
    
    docsRegister.refreshList();
    
  });
  
})(jQuery);
