// Local run load
// k6 run example.js
// k6 run --logformat raw --console-output=test_log.csv example.js
// k6 run --out csv=test_result.csv example.js
// Docker
// docker-compose up
// k6 run --out influxdb=http://localhost:8086/k6 example.js

// main imports
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.0.0/index.js';
import { SharedArray } from 'k6/data';

// default parameter
const baseUrl = 'http://test.k6.io'

// read array from file
const data = new SharedArray('get Users', function () {
    const file = JSON.parse(open('./users.json'));
    return file.users;
});

// scenario
export const options = {
    // old version scenario
    // stages: [
    //     { target: 10, duration: '1m' },
    //     { target: 10, duration: '2m' },
    //     { target: 0, duration: '1m' }
    // ],
    // use executor
    scenarios: {
        contacts: {
            executor: 'constant-vus',
            vus: 10,
            duration: '3m',
        },
    },
    // set thresholds
    thresholds: {
        'http_req_duration': ['p(95)<500'],
    },
};

export default function() {
    // header for first request
    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    // open main page
    let res = http.get('http://test.k6.io', params);
    // check response
    check(res, {
        'is status 200': (r) => r.status === 200
    });

    group('Statistics resources', function() {
            let res = http.batch([
                ['GET', baseUrl + '/static/css/site.css', null, {}],
                ['GET', baseUrl + '/static/js/prisms.js', null, {}]
            ]);
            check(res[0], {
                'is stylesheet 4859 bytes?': (r) => r.body.length === 4859,
            });
    });

    // sleep between step
    sleep(Math.round(randomIntBetween(1,5)));

    group('Login', function() {
        let res = http.get(baseUrl + '/my_messages.php');
        check(res, {
            'Users should not be unauthorized. Is unauthorized header present?': (r) => r.body.indexOf('Unauthorized') !== -1
        });

        // extracting the CSRF token from the response
        let vars = {};
        vars['csrftoken'] = res
            .html()
            .find('input[name=csrftoken]')
            .first()
            .attr('value');

        console.log(vars)

        // work with files
        let position = Math.floor(Math.random() * data.length);
        let credentials = data[position];

        // show data
        console.log(data)
        console.log(position)
        console.log(credentials)

        // create payload
        const payload = {
            login: credentials.username,
            password: credentials.password,
            redir: '1',
            csrftoken: `${vars['csrftoken']}`
        }

        // make request
        res = http.post(baseUrl + '/login.php', payload);
        check(res, {
            'is logged in welcome header present': (r) => r.body.indexOf('Welcome, admin!') !== -1
        });
    });
}
