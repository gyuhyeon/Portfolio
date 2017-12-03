function verify(){
    var regex = /^\d{3}[-]?\d{4}[-]?\d{4}$/; //comment for the inquisitive : you can't get around this one. Server side validation also exists, this is just to provide a slightly faster response to the user :P
    var m = document.getElementsByName("phonenumber")[0].value.match(regex);
    if(m){
        return true;
    }
    else{
        alert("전화번호는 000-0000-0000 형태로 입력해주세요!");
        return false;
    }
}
$(document).ready(function() {
    // process the form
    $('#enlist').click(function(event){
        //if input verification failed
        if(verify()==false){
            return;
        }

        // get the form data
        // there are many ways to get this data using jQuery (you can use the class or id also)
        var formData = {
            'phonenumber'        : $('input[name="phonenumber"]').val(),
            'g-recaptcha-response': grecaptcha.getResponse()
        };

        // process the form
        $.ajax({
            type        : 'POST', // define the type of HTTP verb we want to use (POST for our form)
            url         : 'naverjob/enlist', // the url where we want to POST
            data        : formData, // our data object
            dataType    : 'json', // what type of data do we expect back from the server
                        encode          : true
        })
            // using the done promise callback
            .done(function(data) {

                // log data to the console so we can see
                //console.log(data); 

                //show as alert
                alert(data['response']);
                //force client reload on success
                if(true){
                    location.reload(); 
                }
                // here we will handle errors and validation messages
            });

        // stop the form from submitting the normal way and refreshing the page
        // event.preventDefault(); not actually necessary if we don't hook off of form submit action.
    });
    $('#unsubscribe').click(function(event){
        //if input verification failed
        if(verify()==false){
            return;
        }

        // get the form data
        // there are many ways to get this data using jQuery (you can use the class or id also)
        var formData = {
            'phonenumber'        : $('input[name="phonenumber"]').val(),
            'g-recaptcha-response': grecaptcha.getResponse()
        };

        // process the form
        $.ajax({
            type        : 'POST', // define the type of HTTP verb we want to use (POST for our form)
            url         : 'naverjob/unsubscribe', // the url where we want to POST
            data        : formData, // our data object
            dataType    : 'json', // what type of data do we expect back from the server
                        encode          : true
        })
            // using the done promise callback
            .done(function(data) {

                // log data to the console so we can see
                //console.log(data); 

                //show as alert
                alert(data['response']);
                //force client reload on success
                if(true){
                    location.reload(); 
                }
                // here we will handle errors and validation messages
            });

        // stop the form from submitting the normal way and refreshing the page
        // event.preventDefault(); not actually necessary if we don't hook off of form submit action.
    });
    
});