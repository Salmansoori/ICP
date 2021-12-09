from MySQLdb.cursors import Cursor
from flask import Flask,request,jsonify
from flask.globals import request, session
from flask.templating import render_template
from flask_mysqldb import MySQL
from functools import wraps
import json
import uuid
from datetime import datetime
from flask_mail import Mail, Message

app=Flask(__name__)
mail = Mail(app)
app.secret_key="super secret key"


#mysql connection with flask(enter your database configurations)

app.config['MYSQL_HOST'] = "localhost"
app.config['MYSQL_USER'] = "root"
app.config['MYSQL_PASSWORD'] = "your pass"
app.config['MYSQL_DB'] = "icp"

app.config['MYSQL_CURSORCLASS'] = 'DictCursor'

mysql = MySQL(app)

# configuration of mail
app.config['MAIL_SERVER']='smtp.gmail.com'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USERNAME'] = 'yourmail@gmail.com'
app.config['MAIL_PASSWORD'] = '*******'
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = True
mail = Mail(app)


## home page
@app.route("/")
def home():
    candidates, interviewer, upcoming_interviews = get_candidates_and_interviewer() 
    #print(upcoming_interviews)
    return render_template('index.html', candidates=candidates, interviewer=interviewer, upcoming_interviews=upcoming_interviews)      

@app.route("/schedule", methods=["POST"])        
def schedule_interview():
    if request.method == "POST":
        participants = request.get_json()['participants']
        start_time = request.get_json()['start_time']
        end_time = request.get_json()['end_time']


        if not start_time or not end_time or not participants:
            return "Please provide all fields"        

        if len(participants)<2:
            return "Number of participants must be at least 2"

        if start_time>end_time:
            return "Invalid interview schedule"    

        if not check_avialabilty(participants, start_time, end_time):
            return "Interview already schedule for any of the selected participant"

        try:
            interview_id = uuid.uuid4()
            cur = mysql.connection.cursor()
            for participant in participants:
                cur.execute("INSERT INTO interviews(id, start_time, end_time, participant) VALUES(%s,%s,%s,%s)", [interview_id, start_time, end_time, participant])
            
            mysql.connection.commit()
            cur.close()

            #send mail to participants
            send_mail(participants, start_time, end_time)
            return "Interview Scheduled successfully"
        except:
            return "unsuccessful response"
    return "Method not supported"    


@app.route("/update_schedule/<id>", methods=['PUT'])
def update_schedule(id):
    if request.method=='PUT':
        cur = mysql.connection.cursor()
        cur.execute("select * from interviews where id=%s",[id])
        result = cur.fetchone()
        if not result:
            return "Interview does not exist"

        participants = request.get_json()['participants']
        start_time = request.get_json()['start_time']
        end_time = request.get_json()['end_time']

        if not start_time or not end_time or not participants:
            return "Please provide all fields"

        if start_time>end_time:
            return "Invalid interview schedule"    
        
        if len(participants)<2:
            return "Number of participants must be at least 2"

        if not check_avialabilty(participants, start_time, end_time):
            return "Interview already schedule for any of the selected participant"   

        try:    

            cur.execute("delete * from interviews where id=%s", [id])    
            
            # now add new interview schedule
            
            for participant in participants:
                cur.execute("insert into interviews(id, start_time, end_time, participant) values(%s,%s,%s,%s)",(id, start_time, end_time, participant))

            cur.connection.commit()            
            cur.close()

            #send mail to participants
            send_mail(participants, start_time, end_time)
            return "Interview Schedule updated"
        except:
            return "some error occured"
    return "Method not supported"            


@app.route("/delete/<id>", methods=['DELETE'])
def delete_interview(id):
     
    if request.method=="DELETE":

        cur = mysql.connection.cursor()
        cur.execute("select * from interviews where id=%s", [id])
        result = cur.fetchone()
        if not result:
            return "Invalid interview_id"

        try:
            cur= mysql.connection.cursor()
            cur.execute("delete from interviews where id=%s", [id])
            cur.connection.commit()
            cur.close()
            return "interview deleted successfully"
        except:
            return "some error occured"
    return "method not supported"     

def check_avialabilty(participants, start_time, end_time):
    cur = mysql.connection.cursor()
    for participant in participants:
        #check interview already shedule for any of the selected participants
        cur.execute("select * from interviews where participant=%s",[participant])
        result = cur.fetchall()
        flag = True
        for p in result:
            s_time = datetime.strptime(start_time, "%Y-%m-%dT%H:%M")
            e_time = datetime.strptime(end_time, "%Y-%m-%dT%H:%M")
            print(p['start_time'], s_time, p['end_time'], e_time)
            if (p['start_time']<=s_time<=p['end_time'] or p['start_time']<=e_time<=p['end_time']):
                return False      
    return True

@app.route("/update/<id>")
def update(id):
    cur = mysql.connection.cursor()
    cur.execute("select id,start_time, end_time, participant from interviews where id=%s", [id])
    result = cur.fetchall()
    interview = {}
    for i in result:
        if i['id'] in interview:
            interview[i['id']][2].append(i['participant'])
        else:
            interview[i['id']] = [i['start_time'], i['end_time'], [i['participant']]]
    interview = [id, interview[id][0], interview[id][1], interview[id][2]]      
    #print(interview)
    candidates, interviewer, upcoming_interviews = get_candidates_and_interviewer()
   
    return render_template("update_form.html", interview=interview, id=id, interviewer=interviewer, candidates=candidates )        

def get_candidates_and_interviewer():
    cur = mysql.connection.cursor()
    cur.execute("select * from participant")
    data = cur.fetchall()
    candidates=[]
    interviewer=[]
    for p in data:
        if p['type']==0:
            candidates.append(p['email'])
        else:
            interviewer.append(p['email'])    

    cur.execute("select id,start_time, end_time, participant from interviews")
    result = cur.fetchall()
    cur.close()
    upcoming_interviews = {}
    for i in result:
        if i['id'] in upcoming_interviews:
            upcoming_interviews[i['id']][2].append(i['participant'])
        else:
            upcoming_interviews[i['id']] = [i['start_time'], i['end_time'], [i['participant']]]  
    return candidates, interviewer, upcoming_interviews


def send_mail(participants, start_time, end_time):
    with app.app_context():
        start_time = datetime.fromisoformat(start_time)
        start_time= start_time.strftime('%Y-%m-%d %H:%M')
        end_time = datetime.fromisoformat(end_time)
        end_time= end_time.strftime('%Y-%m-%d %H:%M')
        
        msg = Message(
                    'PFB your interview schedule',
                    sender ='yourmail@gmail.com',
                    recipients = participants
                )
        msg.body = "Interview time: {start_time} to {end_time}".format(start_time=start_time, end_time=end_time)
        mail.send(msg)
        return 'Sent'

if __name__ == "__main__":   
     app.run(debug=True)
