const $ = {
   get(selector){ 
      var ele = document.querySelectorAll(selector);
      for(var i = 0; i < ele.length; i++){
         this.init(ele[i]);
      }
      return ele;
   },

   template(html){
      var template = document.createElement('div');
      template.innerHTML = html.trim();
      return this.init(template.childNodes[0]);
   },

   init(ele){
      ele.on = function(event, func){ this.addEventListener(event, func); }
      return ele;
   }
};

//Build the plugin
var drop = function(info){var o = {
   options: info.options,
   selected: info.selected || [],
   preselected: info.preselected || [],
   open: false,
   html: {
      select: $.get(info.selector)[0],
      options: $.get(info.selector + ' option'),
      parent: undefined,
   },
   init: function(){
      //Setup Drop HTML
      this.html.parent = $.get(info.selector)[0].parentNode
      this.html.drop = $.template('<div class="drop"></div>')
      this.html.dropDisplay = $.template('<div class="drop-display">Display</div>')
      this.html.dropOptions = $.template('<div class="drop-options">Options</div>')
      this.html.dropScreen = $.template('<div class="drop-screen"></div>')
      
      this.html.parent.insertBefore(this.html.drop, this.html.select)
      this.html.drop.appendChild(this.html.dropDisplay)
      this.html.drop.appendChild(this.html.dropOptions)
      this.html.drop.appendChild(this.html.dropScreen)
      //Hide old select
      this.html.drop.appendChild(this.html.select);
      
      //Core Events
      var that = this;
      this.html.dropDisplay.on('click', function(){ that.toggle() });
      this.html.dropScreen.on('click', function(){ that.toggle() });
      //Run Render
      this.load()
      this.preselect()
      this.render();
   },
   toggle: function(){
      this.html.drop.classList.toggle('open');
   },
   addOption: function(e, element){ 
      var index = Number(element.dataset.index);
      this.clearStates()
      var email = element.dataset.email;
      console.log(element.dataset);
      this.selected.push({
         index: Number(index),
         state: 'add',
         email: email,
         removed: false
      })
      this.options[index].state = 'remove';
      this.render()
   },
   removeOption: function(e, element){
      e.stopPropagation();
      this.clearStates()
      var index = Number(element.dataset.index);
      this.selected.forEach(function(select){
         if(select.index == index && !select.removed){
            select.removed = true
            select.state = 'remove'
         }
      })
      this.options[index].state = 'add'
      this.render();
   },
   load: function(){
      this.options = [];
      for(var i = 0; i < this.html.options.length; i++){
         var option = this.html.options[i]
         this.options[i] = {
            html:  option.innerHTML,
            value: option.value,
            selected: option.selected,
            state: ''
         }
      }
   },
   preselect: function(){
      var that = this;
      this.selected = [];
      this.preselected.forEach(function(pre){
         that.selected.push({
            index: pre,
            state: 'add',
            removed: false
         })
         that.options[pre].state = 'remove';
      })
   },
   render: function(){
      this.renderDrop()
      this.renderOptions()
   },
   renderDrop: function(){ 
      var that = this;
      var parentHTML = $.template('<div></div>')
      this.selected.forEach(function(select, index){ 
         var option = that.options[select.index];
         var childHTML = $.template('<span class="item '+ select.state +'">'+ option.html +'</span>')
         var childCloseHTML = $.template(
            '<i class="material-icons btnclose" data-index="'+select.index+'">&#xe5c9;</i></span>')
         childCloseHTML.on('click', function(e){ that.removeOption(e, this) })
         childHTML.appendChild(childCloseHTML)
         parentHTML.appendChild(childHTML)
      })
      this.html.dropDisplay.innerHTML = ''; 
      this.html.dropDisplay.appendChild(parentHTML)
   },
   renderOptions: function(){  
      var that = this;
      var parentHTML = $.template('<div></div>')
      this.options.forEach(function(option, index){
         var childHTML = $.template(
            '<a data-index="'+index+'" data-email="' + option.value + '" class="'+option.state+'">'+ option.html +'</a>')
         childHTML.on('click', function(e){ that.addOption(e, this) })
         parentHTML.appendChild(childHTML)
      })
      this.html.dropOptions.innerHTML = '';
      this.html.dropOptions.appendChild(parentHTML)
   },
   clearStates: function(){
      var that = this;
      this.selected.forEach(function(select, index){ 
         select.state = that.changeState(select.state)
      })
      this.options.forEach(function(option){ 
         option.state = that.changeState(option.state)
      })
   },
   changeState: function(state){
      switch(state){
         case 'remove':
            return 'hide'
         case 'hide':
            return 'hide'
         default:
            return ''
       }
   },
   isSelected: function(index){
      var check = false
      this.selected.forEach(function(select){ 
         if(select.index == index && select.removed == false) check = true
      })
      return check
   }
}; o.init(); return o;}



const candidate = new drop({
  selector:  '#candidate',
  // preselected: [0, 2]
  preselected: []
});
// candidate.toggle();


const interview = new drop({
  selector:  '#interview',
  preselected: []
});
// interview.toggle(); 

const deleteInterview = (id) => {
  
  const url = "http://127.0.0.1:5000/delete/" + id;

  fetch(url, {
     method: "DELETE",
  }).then(response => {
     location.href = "/";
  });

}

const updateForm = (event, id) => {
  // Prevent the form from submitting.
  event.preventDefault()

  const start_time = document.getElementById("start_time").value;
  const end_time = document.getElementById("end_time").value;

  console.log(start_time, end_time);
  
  var emails = [];
  candidate.selected.forEach(data => {
     if(data.removed == false){
        emails.push(data.email);
     }
  })

  interview.selected.forEach(data => {
     if(data.removed == false){
        emails.push(data.email);
     }
  })


  const url = "http://127.0.0.1:5000/update_schedule/" + id;

  fetch(url, {
     method:"PUT",
     headers: {
        "content-type": "application/json",
     },
     body: JSON.stringify({
        "start_time": start_time,
        "end_time": end_time,
        "participants": emails
     })
  }).then( (response) => {
     response.text().then(text => {
        alert(text);
        location.href = "/";
     })
  }
  ).catch( e => {
     alert(e.message);
  })

}

function submitForm(event) {
  // Prevent the form from submitting.
  event.preventDefault()

  const start_time = document.getElementById("start_time").value;
  const end_time = document.getElementById("end_time").value;

  console.log(start_time, end_time);
  
  var emails = [];
  candidate.selected.forEach(data => {
     if(data.removed == false){
        emails.push(data.email);
     }
  })

  interview.selected.forEach(data => {
     if(data.removed == false){
        emails.push(data.email);
     }
  })

  const url = "http://127.0.0.1:5000/schedule";

  fetch(url, {
     method:"POST",
     headers: {
        "content-type": "application/json",
     },
     body: JSON.stringify({
        "start_time": start_time,
        "end_time": end_time,
        "participants": emails
     })
  }).then( (response) => {
     response.text().then(text => {
        alert(text);
        location.href = "/";
     })
  }
  ).catch( e => {
     alert(e.message);
  })

} 

