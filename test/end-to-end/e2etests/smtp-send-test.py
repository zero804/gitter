import unittest
import os
import smtplib

class SMTPSendTest(unittest.TestCase):

    def testMailSend(self):
        host = os.getenv('MAIL_HOST', 'localhost')
        port = int(os.getenv('MAIL_PORT', '2525'))

        msg = open(os.path.dirname(os.path.realpath(__file__)) + '/email.msg.eml', 'r');
        smtp = smtplib.SMTP()
        smtp.connect(host, port)
        smtp.ehlo_or_helo_if_needed()
        smtp.sendmail('testuser@troupetest.local', 'testtroupe1@beta.trou.pe', msg.read())
        smtp.quit()
